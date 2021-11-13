const express = require('express')
const app = express()
const cors = require('cors');
const admin = require("firebase-admin");
require('dotenv').config();
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;

app.use(cors());
app.use(express.json());


const port = process.env.PORT || 8000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ou7jc.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }

    }
    next();
}


async function run() {
    try {
        await client.connect();
        const database = client.db('shivo_DB');
        const productsCollection = database.collection('products');
        const ordersCollection = database.collection('orders');
        const usersCollection = database.collection('users');
        const reviewsCollection = database.collection('reviews');

        app.get('/products' ,async (req, res)=>{
                const cursor = productsCollection.find({});
                const products = await cursor.toArray();
                res.json(products);

        })
        app.put('/products/:id', async (req, res) => {
            const id = req.params.id;
            const updateProduct = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    name: updateProduct.name,
                    price: updateProduct.price,
                    details: updateProduct.details,
                    picture: updateProduct.picture,
                    
                },
            };
            const result = await productsCollection.updateOne(filter, updateDoc, options)
            res.json(result)
          })
        app.delete('/products/:id', async (req, res) => {
            const _id = req.params.id;
            console.log(_id)
            const query = { _id: ObjectId(_id) };
            const result = await productsCollection.deleteOne(query);
            res.json();
          })
        app.post('/products', async (req, res) => {
            const products = req.body;
            const result = await productsCollection.insertOne(products);
            console.log(result);
        });

        app.get('/orders',   async (req, res) => {
            const email= req.query.email;
            if( email ){
                const query = { email: email }
                const cursor = ordersCollection.find(query);
                const orders = await cursor.toArray();
                res.json(orders);
            }
            else{
                const cursor = ordersCollection.find({});
                const orders = await cursor.toArray();
                res.json(orders);
            }
           
        })
        app.put('/orders/:id', async (req, res) => {
            const _id = req.params.id;
            const status=parseInt(req.query.status);
            console.log(_id,status)
            const filter = { _id: ObjectId(_id) };
            if(status==10){
                const options = { upsert: true };
                const updateDoc = { $set:
              { status: "Shipped" }};
                const result = await ordersCollection.updateOne(filter, updateDoc, options);
                res.json('Shipped');    
        }
        
            else if(status==12){
                const options = { upsert: true };
                const updateDoc = { $set:
                    { status: "pending" } };
                const result = await ordersCollection.updateOne(filter, updateDoc, options);
                res.json('pending');
                
            }
           
            
          })


        app.post('/orders',verifyToken, async (req, res) => {
            const orders = req.body;
            const result = await ordersCollection.insertOne(orders);
            res.json(result)
        });
        // delete order
        app.delete('/orders/:id', async (req, res) => {
            const _id = req.params.id;
            console.log(_id);
            const query = { _id: ObjectId(_id) };
            const result = await ordersCollection.deleteOne(query);
            res.json(result);
          })
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            console.log(result);
            res.json(result);
        });

        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });

        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                     const filter = { email: user.email};
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'you do not have access to make admin' })
            }

        })
        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review);
            res.json(result);
        });
        app.get('/reviews', async (req, res) => {
            const cursor = reviewsCollection.find({});
                const reviews = await cursor.toArray();
                res.json( reviews);
        });


    }
    finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Shivo Server')
})

app.listen(port, () => {
    console.log(`listening at ${port}`)
})