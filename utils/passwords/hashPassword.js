import crypto from "crypto"

export function hashPassword(password){
    
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(
      password,
      salt,
      parseInt(process.env.PBKDF2_ITERATIONS),
      parseInt(process.env.PBKDF2_KEYLEN),
      process.env.PBKDF2_DIGEST
    ).toString('hex');
    return { salt, hash };
  };

  export function verifyPassword(password, salt, hash){
    const hashedPassword = crypto.pbkdf2Sync(
      password,
      salt,
      parseInt(process.env.PBKDF2_ITERATIONS),
      parseInt(process.env.PBKDF2_KEYLEN),
      process.env.PBKDF2_DIGEST
    ).toString('hex');
    return hash === hashedPassword;
  };
