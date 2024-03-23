const Redis = require("ioredis");
require("dotenv").config()
const connection = new Redis(
    {
      port: process.env.redis_port,
      host: process.env.redis_host,
      password: process.env.redis_pass,
    }, {
    maxRetriesPerRequest: null
  });


  const redisGetToken = async (email) => {
    try {
      const token = await connection.get(email);
      return token;
    } catch (error) {
      console.error(`Error retrieving token from Redis for email ${email}:`, error.message);
      throw new Error(`Error retrieving token from Redis for email ${email}.`);
    }
  };
  




  module.exports = {
    connection,
    redisGetToken
  }