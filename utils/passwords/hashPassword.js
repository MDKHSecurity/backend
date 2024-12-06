import crypto from "crypto"
import { pbkdf2 } from "pbkdf2";

export function hashElement(element){
    
    const hash = crypto.pbkdf2Sync(
      element,
      process.env.PBKDF2_SALT,
      parseInt(process.env.PBKDF2_ITERATIONS),
      parseInt(process.env.PBKDF2_KEYLEN),
      process.env.PBKDF2_DIGEST
    ).toString('hex');
    return hash;
  };

  export function verifyPassword(password, hash){
    const hashedPassword = crypto.pbkdf2Sync(
      password,
      process.env.PBKDF2_SALT,
      parseInt(process.env.PBKDF2_ITERATIONS),
      parseInt(process.env.PBKDF2_KEYLEN),
      process.env.PBKDF2_DIGEST
    ).toString('hex');

    return hash === hashedPassword;
  };

// export function hashWithPbkdf(element) {
//   try {
//       // Ensure all environment variables are available
//       const salt = process.env.PBKDF2_SALT || "default_salt";
//       const iterations = parseInt(process.env.PBKDF2_ITERATIONS, 10) || 100000;
//       const keylen = parseInt(process.env.PBKDF2_KEYLEN, 10) || 64;
//       const digest = process.env.PBKDF2_DIGEST || "sha512";

//       // Perform hashing
//       const derivedKey = pbkdf2Sync(element, salt, iterations, keylen, digest);

//       console.log("Derived Key:", derivedKey.toString("hex"));
//       return derivedKey.toString("hex");
//   } catch (error) {
//       console.error("Error hashing with PBKDF2:", error);
//   }
// }
//   hashWithPbkdf("ewewe")
