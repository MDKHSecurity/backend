import jwt from "jsonwebtoken";
import db from "../../database/database.js";

const jwtSecret = process.env.JWT_SECRET;

export async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const refreshHeader = req.headers['x-refresh-token'];

    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify the Access Token
    jwt.verify(token, jwtSecret, async (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                console.log("Access token expired. Checking for refresh token...");

                // Prevent multiple refresh attempts
                if (req.tokenRefreshInProgress) {
                   
                    return res.status(429).json({ message: 'Token refresh in progress. Please retry.' });
                }

                req.tokenRefreshInProgress = true;

                // Verify the Refresh Token
                if (!refreshHeader) {
                    return res.status(401).json({ message: 'Session expired. Please log in again.' });
                }

                try {
                    const decodedRefresh = jwt.verify(refreshHeader, jwtSecret);

                    // Check refresh token validity in DB
                    const query = `SELECT user_id FROM tokens WHERE token_string = ? AND token_type_id = 2`;
                    const [tokens] = await db.connection.query(query, [refreshHeader]);

                    if (!tokens || tokens.length === 0) {
                        return res.status(403).json({ message: 'Invalid refresh token. Please log in again.' });
                    }

                    // Generate new tokens
                    const newAccessToken = jwt.sign(
                        { 
                            id: decodedRefresh.id, 
                            username: decodedRefresh.username, 
                            email: decodedRefresh.email, 
                            institution_id: decodedRefresh.institution_id,
                            role_name: decodedRefresh.role_name,
                            isLoggedIn: decodedRefresh.isLoggedIn 
                        },
                        jwtSecret, { expiresIn: '15m' }
                    );

                    const newRefreshToken = jwt.sign(
                        { 
                            id: decodedRefresh.id, 
                            username: decodedRefresh.username, 
                            email: decodedRefresh.email, 
                            institution_id: decodedRefresh.institution_id,
                            role_name: decodedRefresh.role_name,
                            isLoggedIn: decodedRefresh.isLoggedIn 
                        },
                        jwtSecret, { expiresIn: '1d' }
                    );
                    const decodedNewRefreshToken = jwt.verify(newRefreshToken, jwtSecret);
        
                    
                    // Update refresh token in the DB
                    await db.connection.beginTransaction();
                    try {
                        const deleteQuery = "DELETE FROM tokens WHERE user_id = ? AND token_type_id = 2";
                        await db.connection.query(deleteQuery, [decodedRefresh.id]);

                        const insertQuery = "INSERT INTO tokens (token_string, token_type_id, user_id) VALUES (?, ?, ?)";
                        await db.connection.query(insertQuery, [newRefreshToken, 2, decodedRefresh.id]);

                        await db.connection.commit();
                    } catch (dbError) {
                        await db.connection.rollback();
                        console.error("Failed to update tokens:", dbError);
                        return res.status(500).json({ message: 'Internal server error.' });
                    }
                    res.clearCookie('jwt', { path: '/api', secure: true, httpOnly: true});
                    res.clearCookie('refreshToken',{ path: '/api', secure: true, httpOnly: true});       
                    // Set new tokens in cookies 
                    res.cookie('jwt', newAccessToken, { httpOnly: true, secure: true,});
                    res.cookie('werwer', "werwer", { httpOnly: true, secure: true,});
                    
                    // Attach user to request
                    req.user = { id: decodedRefresh.id, username: decodedRefresh.username, refreshToken: newRefreshToken, accessToken: newAccessToken};
                    req.tokenRefreshInProgress = false; // Reset the flag

                    return next();  
                } catch (refreshError) {
                    console.error("Failed to refresh token:", refreshError);
                    return res.status(401).json({ message: 'Session expired. Please log in again.' });
                }
            }

            // Other token errors
            return res.status(403).json({ message: 'Forbidden' });
        }

        // Token is valid; attach user to the request
        req.user = user;
        req.user.isLoggedIn = true;
        req.tokenRefreshInProgress = false; // Reset the flag
        next();
    });
}
