"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const PORT = process.env.PORT;
if (!PORT) {
    throw new Error('PORT not defined');
}
const MONGODB_URL = process.env.MONGODB_URL;
if (!MONGODB_URL || typeof MONGODB_URL !== 'string') {
    throw new Error('MONGODB_URL not defined or incorrect in process.env');
}
const SECRET = process.env.SECRET;
if (!SECRET || typeof SECRET !== 'string') {
    throw new Error('environment SECRET not set!');
}
exports.default = { PORT, MONGODB_URL, SECRET };
