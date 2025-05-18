const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[*] Conexion a BBDD mongo Atlas: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[!] Error al conectar a la BBDD mongo Atlas: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;