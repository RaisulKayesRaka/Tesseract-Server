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
    const upvotesCollection = database.collection("upvotes");
    const downvotesCollection = database.collection("downvotes");
    const couponsCollection = database.collection("coupons");

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

    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req?.params?.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.patch("/users/make-moderator/:id", async (req, res) => {
      const id = req?.params?.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { role: "moderator" } };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/users/make-admin/:id", async (req, res) => {
      const id = req?.params?.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { role: "admin" } };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    app.get("/all-products", async (req, res) => {
      const email = req?.query?.email;

      let query = {};

      if (email) {
        query = { ...query, ownerEmail: email };
      }

      const result = await productsCollection
        .find(query)
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });

    app.get("/queued-products", async (req, res) => {
      const result = await productsCollection
        .aggregate([
          {
            $addFields: {
              statusOrder: {
                $switch: {
                  branches: [
                    { case: { $eq: ["$status", "Pending"] }, then: 0 },
                    { case: { $eq: ["$status", "Accepted"] }, then: 1 },
                    { case: { $eq: ["$status", "Rejected"] }, then: 2 },
                  ],
                  default: 3,
                },
              },
            },
          },
          { $sort: { statusOrder: 1, date: -1 } },
          { $project: { statusOrder: 0 } },
        ])
        .toArray();
      res.send(result);
    });

    app.get("/accepted-products", async (req, res) => {
      const email = req?.query?.email;
      const page = parseInt(req?.query?.page);
      const size = parseInt(req?.query?.size);
      const search = req?.query?.search;

      let query = { status: "Accepted" };

      if (search) {
        query.productTags = {
          $elemMatch: {
            text: { $regex: search, $options: "i" },
          },
        };
      }

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

    app.get("/reported-products", async (req, res) => {
      let query = { isReported: true };

      const result = await productsCollection
        .find(query)
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });

    app.patch("/products/make-reported/:id", async (req, res) => {
      const id = req?.params?.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { isReported: true } };
      const result = await productsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/products/make-featured/:id", async (req, res) => {
      const id = req?.params?.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { type: "Featured", status: "Accepted" } };
      const result = await productsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/products/make-accepted/:id", async (req, res) => {
      const id = req?.params?.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { status: "Accepted" } };
      const result = await productsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/products/make-rejected/:id", async (req, res) => {
      const id = req?.params?.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { status: "Rejected", type: "Normal" } };
      const result = await productsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/products/is-upvoted/:id", async (req, res) => {
      const id = req?.params?.id;
      const email = req?.query?.email;
      const query = { productId: new ObjectId(id), email: email };
      const result = await upvotesCollection.findOne(query);
      res.send(result?._id ? true : false);
    });

    app.put("/products/upvote/:id", async (req, res) => {
      const id = req?.params?.id;
      const email = req?.query?.email;
      const query = { productId: new ObjectId(id), email };

      const isUpvoted = await upvotesCollection.findOne(query);

      if (!isUpvoted) {
        await upvotesCollection.insertOne({
          email,
          productId: new ObjectId(id),
        });
      } else {
        await upvotesCollection.deleteOne(query);
      }

      const updateDoc = isUpvoted
        ? { $inc: { upvotes: -1 } }
        : { $inc: { upvotes: 1 } };

      const result = await productsCollection.updateOne(
        { _id: new ObjectId(id) },
        updateDoc
      );

      res.send(result);
    });

    app.get("/products/is-downvoted/:id", async (req, res) => {
      const id = req?.params?.id;
      const email = req?.query?.email;
      const query = { productId: new ObjectId(id), email: email };
      const result = await downvotesCollection.findOne(query);
      res.send(result?._id ? true : false);
    });

    app.put("/products/downvote/:id", async (req, res) => {
      const id = req?.params?.id;
      const email = req?.query?.email;
      const query = { productId: new ObjectId(id), email };

      const isDownvoted = await downvotesCollection.findOne(query);

      if (!isDownvoted) {
        await downvotesCollection.insertOne({
          email,
          productId: new ObjectId(id),
        });
      } else {
        await downvotesCollection.deleteOne(query);
      }

      const updateDoc = isDownvoted
        ? { $inc: { downvotes: -1 } }
        : { $inc: { downvotes: 1 } };

      const result = await productsCollection.updateOne(
        { _id: new ObjectId(id) },
        updateDoc
      );

      res.send(result);
    });

    app.get("/featured-products", async (req, res) => {
      const query = { type: "Featured", status: "Accepted" };
      const result = await productsCollection
        .find(query)
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });

    app.get("/trending-products", async (req, res) => {
      const query = { status: "Accepted" };
      const result = await productsCollection
        .find(query)
        .sort({ upvotes: -1, downvotes: 1 })
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

    app.put("/products/:id", async (req, res) => {
      const id = req?.params?.id;
      const product = req?.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = { $set: product };
      const result = await productsCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.delete("/products/:id", async (req, res) => {
      const id = req?.params?.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
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

    app.post("/coupons", async (req, res) => {
      const coupon = req.body;
      const result = await couponsCollection.insertOne(coupon);
      res.send(result);
    });

    app.get("/coupons", async (req, res) => {
      const coupons = await couponsCollection.find().toArray();
      res.send(coupons);
    });
    
  } finally {
    //   await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
