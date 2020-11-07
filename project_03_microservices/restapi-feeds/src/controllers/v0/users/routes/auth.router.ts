import { Router, Request, Response } from 'express';

import { User } from '../models/User';

import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { NextFunction } from 'connect';

import * as EmailValidator from 'email-validator';
import { config } from '../../../../config/config';

const router: Router = Router();


async function generatePassword(plainTextPassword: string): Promise<string> {
    console.log("plainPassword " + plainTextPassword)
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    console.log("hash " + salt)
    return await bcrypt.hash(plainTextPassword, salt);
}

async function comparePasswords(plainTextPassword: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(plainTextPassword, hash);
}


function generateJWT(user: User): string {
    console.log("user " + user);
    console.log("jwt secret " + config.jwt.secret);
    
    return jwt.sign(JSON.stringify(user.short()), config.jwt.secret);
}


export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.headers || !req.headers.authorization){
        return res.status(401).send({ message: 'No authorization headers.' });
    }
    //Bearer faelklaejslkaejlejalekjaes
    const token_bearer = req.headers.authorization.split(' ');
    if(token_bearer.length != 2){
        return res.status(401).send({ message: 'Malformed token.' });
    }
    const token = token_bearer[1];
    return jwt.verify(token, config.jwt.secret , (err, decoded) => {
      if (err) {
        return res.status(500).send({ auth: false, message: 'Failed to authenticate.' });
      }
      return next();
    }); 
}

router.get('/verification', 
    requireAuth, 
    async (req: Request, res: Response) => {
        return res.status(200).send({ auth: true, message: 'Authenticated.' });
});

router.post('/login', async (req: Request, res: Response) => {
    const email = req.body.email;
    const password = req.body.password;
    
    // check email is valid
    if (!email || !EmailValidator.validate(email)) {
        return res.status(400).send({ auth: false, message: 'Email is required or malformed' });
    }
    // check email password valid
    if (!password) {
        return res.status(400).send({ auth: false, message: 'Password is required' });
    }
    const user = await User.findByPk(email);
    if(!user) {
        return res.status(401).send({ auth: false, message: 'Unauthorized' });
    }
    // check that the password matches
    const authValid = await comparePasswords(password, user.password_hash)
    if(!authValid) {
        return res.status(401).send({ auth: false, message: 'Unauthorized' });
    }
    // Generate JWT
    const jwt = generateJWT(user);
    console.log("jwt {" + jwt + "}");
    
    res.status(200).send({ auth: true, token: jwt, user: user.short()});
});

//register a new user /api/v0/users/auth/ 
router.post('/', async (req: Request, res: Response) => {
    const email = req.body.email;
    const plainTextPassword = req.body.password;
    console.log("email" + email);
    console.log("password" + plainTextPassword);

    // check email is valid
    if (!email || !EmailValidator.validate(email)) {
        return res.status(400).send({ auth: false, message: 'Email is required or malformed' });
    }
    // check email password valid
    if (!plainTextPassword) {
        return res.status(400).send({ auth: false, message: 'Password is required' });
    }
    // check that user doesnt exists
    const user = await User.findByPk(email);
    console.log("user email" + user);
    
    if (user) {
        console.log("user " + user);
        
        return res.status(422).send({ auth: false, message: 'User may already exist' });
    }
    console.log("01 " + plainTextPassword);
    
    const password_hash = await generatePassword(plainTextPassword);
    console.log("02 " + password_hash);
    
    const newUser = await new User({
        email: email,
        password_hash: password_hash
    });
    let savedUser;
    try {
        savedUser = await newUser.save();
    } catch (e) {
        throw e;
    }
    const jwt = generateJWT(savedUser);
    res.status(201).send({token: jwt, user: savedUser.short()});
});

router.get('/', async (req: Request, res: Response) => {
    res.send('auth')
});

export const AuthRouter: Router = router;