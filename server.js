const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');
const knex = require('knex');

app.use(bodyParser.json());
app.use(cors());

const db = knex({
    client: 'pg',
    connection: {
        connectionString: process.env.DATABASE_URL,
        ssl: true,
    }
});

const database = {
    users: [{
            id: '123',
            name: 'John',
            password: 'cookies',
            email: 'john@gmail.com',
            entries: 0,
            joined: new Date(),
        },
        {
            id: '124',
            name: 'Sally',
            password: 'bananas',
            email: 'sallt@gmail.com',
            entries: 0,
            joined: new Date(),
        }
    ],
    login: [{
        id: '987',
        hash: '',
        email: 'john@gmail.com'
    }]
}

app.get('/', (req, res) => {
    res.send("hello");
})

app.post('/signin', (req, res) => {
    db.select('email', 'hash').from('login')
        .where('email', '=', req.body.email)
        .then(data => {
            const isValid = bcrypt.compareSync(req.body.password, data[0].hash)
            if (isValid) {
                return db.select('*').from('users')
                    .where('email', '=', req.body.email)
                    .then(user => {
                        res.json(user[0])
                    })
                    .catch(err => res.status(400).json("Error"));
            } else {
                res.status(400).json('No coincide la contraseña');
            }
        })
        .catch(err => res.status(400).json('No coincide la contraseña o email'))
})

app.post('/register', (req, res) => {
    const { email, name, password } = req.body; //destructigturing
    if (!email || !name || !password) {
        return res.status(400).json("Error en la información ingresada");
    }
    const hash = bcrypt.hashSync(password, 0);
    db.transaction(trx => { //si uno falla, todo falla (ya q usamos 2 tablas login y register)
            trx.insert({
                    hash: hash,
                    email: email
                })
                .into('login')
                .returning('email')
                .then(loginEmail => {
                    return trx('users')
                        .returning('*')
                        .insert({
                            email: loginEmail[0],
                            name: name,
                            joined: new Date()
                        })
                        .then(user => {
                            res.json(user[0]); //retorna todo de la tabla ya q hay returning(*)
                        })
                })
                .then(trx.commit) //si funciona todo, commit
                .catch(trx.rollback) //sino rollback
        })
        .catch(err => res.status(400).json("No se puede conectar"))
        //cuando se registra 2 veces el mismo mail, agarra un erro desde basededatos.
})

app.get('/profile/:id', (req, res) => {
    const { id } = req.params;
    db.select('*').from('users').where({
            id: id,
        })
        .then(user => {
            if (user.length) {
                res.json(user[0]);
            } else {
                res.status(400).json('No existe el usuario');
            }
        })

})

app.put('/image', (req, res) => {
    const { id } = req.body;
    db('users').where('id', '=', id)
        .increment('entries', 1)
        .returning('entries')
        .then(entries => {
            res.json(entries[0]);
        })
        .catch(err => res.status(400).json(err));
})

app.listen(process.env.PORT || 3000, () => {
    console.log('working');
});