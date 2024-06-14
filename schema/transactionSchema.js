const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  firstname: String,
  lastname: String,
  email: String,
  phone: String,
  address: String,
  amount: Number,
  payment_id: String,
  order_id: String,
  status: String,
});

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
