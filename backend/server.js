require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");


const app = express();
app.use(
    cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
    })
);
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:"],
                connectSrc: ["'self'"],
            },
        },
    })
);
const frontendPath = path.join(__dirname, "../frontend");

app.use(express.static(frontendPath));
const PORT = process.env.PORT || 3000;

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 1000 * 60 * 60 * 24,
        },
    })
);
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "Too many login attempts. Please try again later.",
    },
});
app.use(express.json({ limit: "10kb" }));

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

app.get("/register", (req, res) => {
    res.sendFile(path.join(frontendPath, "register.html"));
});
app.get("/login", (req, res) => {
    res.sendFile(path.join(frontendPath, "login.html"));
});
app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(frontendPath, "dashboard.html"));
});
app.get("/", (req, res) => {
    res.json({
        message: "Expense Tracker API is running",
    });
});


function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({
            error: "Not authenticated",
        });
    }

    next();
}
app.get("/api/expenses", requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;

        const [expenses] = await db.execute(
            "SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC",
            [userId]
        );

        res.json(expenses);
    } catch (error) {
        console.error("Error fetching expenses:", error.message);

        res.status(500).json({
            error: "Failed to fetch expenses",
        });
    }
});

app.get("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
        const expenseId = req.params.id;
        const userId = req.session.userId;

        const [expenses] = await db.execute(
            `SELECT *
             FROM expenses
             WHERE id = ? AND user_id = ?`,
            [expenseId, userId]
        );

        if (expenses.length === 0) {
            return res.status(404).json({
                error: "Expense not found",
            });
        }

        res.json(expenses[0]);
    } catch (error) {
        console.error("Error fetching expense:", error.message);

        res.status(500).json({
            error: "Failed to fetch expense",
        });
    }
});
app.post("/api/expenses", requireAuth, async (req, res) => {
    try {
        const { amount, category, description, date } = req.body;
        const userId = req.session.userId;

        if (amount === undefined || amount === null || amount === "") {
            return res.status(400).json({
                error: "Amount is required",
            });
        }

        const numericAmount = Number(amount);

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                error: "Amount must be a positive number",
            });
        }

        if (typeof category !== "string" || category.trim() === "") {
            return res.status(400).json({
                error: "Category is required",
            });
        }

        if (category.length > 50) {
            return res.status(400).json({
                error: "Category must be 50 characters or fewer",
            });
        }

        if (description !== undefined && typeof description !== "string") {
            return res.status(400).json({
                error: "Description must be a string",
            });
        }

        if (description && description.length > 255) {
            return res.status(400).json({
                error: "Description must be 255 characters or fewer",
            });
        }

        if (!date || Number.isNaN(Date.parse(date))) {
            return res.status(400).json({
                error: "A valid date is required",
            });
        }

        const [result] = await db.execute(
            `INSERT INTO expenses
                (user_id, amount, category, description, date)
             VALUES (?, ?, ?, ?, ?)`,
            [
                userId,
                numericAmount,
                category.trim(),
                description?.trim() || null,
                date,
            ]
        );

        const [expenses] = await db.execute(
            "SELECT * FROM expenses WHERE id = ? AND user_id = ?",
            [result.insertId, userId]
        );

        res.status(201).json(expenses[0]);
    } catch (error) {
        console.error("Error creating expense:", error.message);

        res.status(500).json({
            error: "Failed to create expense",
        });
    }
});
app.put("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
        const expenseId = req.params.id;
        const userId = req.session.userId;
        const { amount, category, description, date } = req.body;
        if (amount === undefined || amount === null || amount === "") {
    return res.status(400).json({
        error: "Amount is required",
    });
}

const numericAmount = Number(amount);

if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({
        error: "Amount must be a positive number",
    });
}

if (typeof category !== "string" || category.trim() === "") {
    return res.status(400).json({
        error: "Category is required",
    });
}

if (description !== undefined && typeof description !== "string") {
    return res.status(400).json({
        error: "Description must be a string",
    });
}

if (!date || Number.isNaN(Date.parse(date))) {
    return res.status(400).json({
        error: "A valid date is required",
    });
}

        const [result] = await db.execute(
            `UPDATE expenses
             SET amount = ?, category = ?, description = ?, date = ?
             WHERE id = ? AND user_id = ?`,
            [
    numericAmount,
    category.trim(),
    description?.trim() || null,
    date,
    expenseId,
    userId,
]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Expense not found",
            });
        }

        const [expenses] = await db.execute(
            "SELECT * FROM expenses WHERE id = ? AND user_id = ?",
            [expenseId, userId]
        );

        res.json(expenses[0]);
    } catch (error) {
        console.error("Error updating expense:", error.message);

        res.status(500).json({
            error: "Failed to update expense",
        });
    }
});
app.delete("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
        const expenseId = req.params.id;
        const userId = req.session.userId;

        const [result] = await db.execute(
            "DELETE FROM expenses WHERE id = ? AND user_id = ?",
            [expenseId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Expense not found",
            });
        }

        res.json({
            message: "Expense deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting expense:", error.message);

        res.status(500).json({
            error: "Failed to delete expense",
        });
    }
});
app.post("/api/auth/register", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (typeof username !== "string" || username.trim() === "") {
    return res.status(400).json({
        error: "Username is required",
    });
}

if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({
        error: "Password must be at least 8 characters",
    });
}   
        const cleanUsername = username.trim();
        const [existingUsers] = await db.execute(
            "SELECT id FROM users WHERE username = ?",
            [cleanUsername]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                error: "Username already exists",
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const [result] = await db.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            [username, passwordHash]
        );

        res.status(201).json({
            id: result.insertId,
            username,
            message: "User registered successfully",
        });
    } catch (error) {
        console.error("Error registering user:", error.message);

        res.status(500).json({
            error: "Failed to register user",
        });
    }
});
app.post("/api/auth/login", loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        const [users] = await db.execute(
            "SELECT id, username, password_hash FROM users WHERE username = ?",
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({
                error: "Invalid username or password",
            });
        }

        const user = users[0];

        const passwordMatches = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                error: "Invalid username or password",
            });
        }
req.session.userId = user.id;

        res.json({
            message: "Login successful",
            user: {
                id: user.id,
                username: user.username,
            },
        });
    } catch (error) {
        console.error("Error logging in:", error.message);

        res.status(500).json({
            error: "Failed to log in",
        });
    }
});
app.get("/api/auth/me", async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                error: "Not authenticated",
            });
        }

        const [users] = await db.execute(
            "SELECT id, username FROM users WHERE id = ?",
            [req.session.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({
                error: "User no longer exists",
            });
        }

        res.json({
            user: users[0],
        });
    } catch (error) {
        console.error("Error fetching current user:", error.message);

        res.status(500).json({
            error: "Failed to fetch current user",
        });
    }
});
app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            console.error("Error logging out:", error.message);

            return res.status(500).json({
                error: "Failed to log out",
            });
        }

        res.clearCookie("connect.sid");

        res.json({
            message: "Logout successful",
        });
    });
});
app.get("/api/expenses/summary/total", requireAuth, async (req, res) => {
    try {
        const [rows] = await db.execute(
            `
            SELECT SUM(amount) AS total
            FROM expenses
            WHERE user_id = ?
            `,
            [req.session.userId]
        );

        res.json({
            total: rows[0].total || 0,
        });
    } catch (error) {
        console.error("Error calculating total expenses:", error);

        res.status(500).json({
            error: "Failed to calculate total expenses",
        });
    }
});
app.get("/api/expenses/summary/category", requireAuth, async (req, res) => {
    try {
        const [rows] = await db.execute(
            `
            SELECT
                category,
                SUM(amount) AS total
            FROM expenses
            WHERE user_id = ?
            GROUP BY category
            ORDER BY total DESC
            `,
            [req.session.userId]
        );

        res.json(rows);
    } catch (error) {
        console.error("Error calculating category summary:", error);

        res.status(500).json({
            error: "Failed to calculate category summary",
        });
    }
});
app.get("/api/expenses/summary/month", requireAuth, async (req, res) => {
    try {
        const [rows] = await db.execute(
            `
            SELECT
                DATE_FORMAT(date, '%Y-%m') AS month,
                SUM(amount) AS total
            FROM expenses
            WHERE user_id = ?
            GROUP BY DATE_FORMAT(date, '%Y-%m')
            ORDER BY month DESC
            `,
            [req.session.userId]
        );

        res.json(rows);
    } catch (error) {
        console.error("Error calculating monthly summary:", error);

        res.status(500).json({
            error: "Failed to calculate monthly summary",
        });
    }
});

app.get("/healthz", (req, res) => {
    res.status(200).json({
        status: "ok",
    });
});
app.get("/readyz", async (req, res) => {
    try {
        await db.execute("SELECT 1");

        res.status(200).json({
            status: "ready",
        });
    } catch (error) {
        console.error("Readiness check failed:", error);

        res.status(503).json({
            status: "not ready",
        });
    }
});
app.use((req, res) => {
    res.status(404).json({
        error: "Route not found",
    });
});
app.use((error, req, res, next) => {
    console.error("Unhandled server error:", error);

    res.status(500).json({
        error: "Internal server error",
    });
});
async function startServer() {
    try {
        const connection = await db.getConnection();

        console.log("MySQL database connected successfully");

        connection.release();

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Unable to connect to MySQL:", error.message);
        process.exit(1);
    }
}
process.on("SIGTERM", async () => {
    console.log("SIGTERM received. Closing MySQL pool...");

    await db.end();

    process.exit(0);
});

process.on("SIGINT", async () => {
    console.log("SIGINT received. Closing MySQL pool...");

    await db.end();

    process.exit(0);
});
startServer();
