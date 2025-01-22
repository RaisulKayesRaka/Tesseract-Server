require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(cors());
app.use(express.json());
const port = process.env.PORT || 5000;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.3meil.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Tesseract");
});
async function run() {
  try {
    // await client.connect();
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
    const database = client.db("Tesseract");
    const usersCollection = database.collection("users");
    const productsCollection = database.collection("products");
    const reviewsCollection = database.collection("reviews");

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user?.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null });
      }
      const result = await usersCollection.insertOne({ ...user, role: "user" });
      res.send(result);
    });

    // find data for empty query or with query based on condition of users
    app.get("/users/:email", async (req, res) => {
      const email = req?.params?.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    app.get("/products", async (req, res) => {
      const email = req?.query?.email;
      const page = parseInt(req?.query?.page);
      const size = parseInt(req?.query?.size);
      const search = req?.query?.search;
      let query = search
        ? { productTags: { $regex: search, $options: "i" } }
        : {};

      if (email) {
        query = { ...query, ownerEmail: email };
      }
      const result = await productsCollection
        .find(query)
        .sort({ date: -1 })
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    app.get("/featured-products", async (req, res) => {
      const query = { type: "featured" };
      const result = await productsCollection
        .find(query)
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });

    app.get("/trending-products", async (req, res) => {
      const query = {};
      const result = await productsCollection
        .find(query)
        .sort({ upvotes: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    app.get("/products/:id", async (req, res) => {
      const id = req?.params?.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    });

    app.get("/reviews/:id", async (req, res) => {
      const id = req?.params?.id;
      const query = { productId: id };
      const result = await reviewsCollection
        .find(query)
        .sort({ reviewDate: -1 })
        .toArray();
      res.send(result);
    });

    app.get("/products-count", async (req, res) => {
      const count = await productsCollection.estimatedDocumentCount();
      res.send({ count });
    });
  } finally {
    //   await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
