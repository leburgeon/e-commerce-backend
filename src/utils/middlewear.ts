import { Request, Response, NextFunction } from "express"
import {  JwtUserPayloadSchema, LoginCredentialsSchema, NewProductSchema, NewUserSchema } from "./validators"
import mongoose from "mongoose"
import { ZodError } from "zod"
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'
import config from "./config"
import User from "../models/User"
import { AuthenticatedRequest} from "../types"

// Middlewear for authenticating a user and extracting the user info into the request
export const authenticateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {

  // Extracts the authorisation header from the request
  const authorisation = req.get('Authorization')

  // Checks that the token uses the bearer scheme and if not sends the request
  if (!authorisation || !authorisation.startsWith('Bearer ')){
    res.status(400).json({error: 'Please provide authentication token with bearer scheme'})
  } else {
    try {

      // Attempts to verify the token with the environment secret
      const token = authorisation.replace('Bearer ', '')
      const decoded = jwt.verify(token, config.SECRET)
      const payload = JwtUserPayloadSchema.parse(decoded)

      // Finds the user with the id in the payload
      const userDocument = await User.findById(payload.id)      
      if (!userDocument) {

        // If the user is not found, response is updates
        res.status(400).send({error: 'User not found, re-login'})
      } else {

        // Sets the user field of the request
        const user = {
          username: userDocument.username,
          name: userDocument.name,
          id: userDocument._id.toString()
        } 
        req.user = user
        next()
      }
    } catch (error: unknown) {
      console.log('Error thrown during auth')
      next(error)
    }
  }
}

// Middlewear for authenticating an admin
export const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
  authenticateUser(req, res, next)
  if ((req as AuthenticatedRequest).user?.isAdmin) {
    next()
  } else {
    const notAdminError = new Error('Admin not found')
    notAdminError.name = 'NotAdminError'
    next(notAdminError)
  }
}

// Middlewear for parsing the request body before creating a new user
export const parseNewUser = (req: Request, _res: Response, next: NextFunction) => {
  try {
    NewUserSchema.parse(req.body)
    next()
  } catch (error: unknown) {
    next(error)
  }
}

// Middlewear for parsing the request body for the fields required for a new product
export const parseNewProduct = (req: Request, _res: Response, next: NextFunction) => {
  try {
    NewProductSchema.parse(req.body)
    next()
  } catch (error: unknown) {
    next(error)
  }
}

// For parsing the request body for the login credentials
export const parseLoginCredentials = (req: Request, _res: Response, next: NextFunction) => {
  try {
    LoginCredentialsSchema.parse(req.body)
    next()
  } catch (error: unknown) {
    next(error)
  }
}

// Error handler for the application
export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof mongoose.Error.ValidationError) {  // For handling a mongoose validation error
    res.status(400).json({error: error.message})
  } else if (error instanceof mongoose.Error.CastError) { // For handling mongoose cast error
    res.status(400).json({error: error.message})
  } else if ((error as any).code === 11000 && error instanceof Error) { // For handling mongo duplicate key error
    res.status(409).json({error: 'Duplicate Key Error: ' + error.message})
  } else if (error instanceof ZodError) { // For handling duplicate key error
    res.status(401).json({error: error.issues})
  } else if (error instanceof JsonWebTokenError) {
    res.status(401).json({error: `${error.name}:${error.message}`})
  } else if (error instanceof TokenExpiredError){
    res.status(400).json({error: 'Token expired, please re-login'})
  } else {
    console.error(error)
    res.status(500).json({error: 'Internal Server Error'})
  }
}