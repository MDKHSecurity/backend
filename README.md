# Backend

Welcome to the **MDKHSecurity** backend repository. This readme will guide you through the setup and usage of the backend.

---

## Before You Begin

Ensure that you have the following software installed:

- [Node.js](https://nodejs.org/)
- [MySQL](https://www.mysql.com/downloads/)

---

## Getting Started

Follow the steps below to set up and run the project:

### 1. Clone the Repository

Clone this repository and navigate to the project folder:

```bash
# Clone the repository
git clone https://github.com/MDKHSecurity/backend.git

# Navigate to the repository folder
cd folder-where-repo-located

# Install dependencies
npm install
```

### 2. Create the Database

Download database dump from: https://github.com/MDKHSecurity/backend/blob/main/database/MDKHSecurity_Database.zip

Create scheme MDKHSecurity and navigate to Server --> Data import and import the dump.

### 3. Create `.env`

Create a `.env` file in the root directory of the project and insert the following settings:
```bash
SQL_CONNECTION_STRING = mysql://Username:Password@127.0.0.1/mdkhsecurity
SQL_PORT = 3306
JWT_SECRET = 944e64693e8d4b712c340aec2ae1d398
JWT_EXPIRES_IN = 120m
PBKDF2_ITERATIONS = 1000
PBKDF2_KEYLEN = 64
PBKDF2_DIGEST = sha512
PBKDF2_SALT = c986c77be264b99dfadfed761567031d
```

This is not the real secrets, but is for the solely purpose of testing.
Insert Username and Password of from your local mysql workbench.

### 4. Run the Backend

Start the backend server using node:

```bash
node app.js
```

---
