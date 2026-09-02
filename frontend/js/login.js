const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("passwordToggle");
const messageElement = document.getElementById("message");
const loginButton = document.getElementById("loginButton");

function setMessage(message, type = "error") {
    messageElement.textContent = message;
    messageElement.dataset.type = type;
}

function setLoading(isLoading) {
    loginButton.disabled = isLoading;
    loginButton.classList.toggle("is-loading", isLoading);
}

function togglePasswordVisibility() {
    const isPassword = passwordInput.type === "password";

    passwordInput.type = isPassword ? "text" : "password";
    passwordToggle.textContent = isPassword ? "Hide" : "Show";
    passwordToggle.setAttribute(
        "aria-label",
        isPassword ? "Hide password" : "Show password"
    );
    passwordToggle.setAttribute(
        "aria-pressed",
        String(isPassword)
    );
}

function validateLoginForm() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username) {
        return "Username is required";
    }

    if (!password) {
        return "Password is required";
    }

    return null;
}

async function loginUser(event) {
    event.preventDefault();

    setMessage("");

    const validationError = validateLoginForm();

    if (validationError) {
        setMessage(validationError);
        return;
    }

    setLoading(true);

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
                username: usernameInput.value.trim(),
                password: passwordInput.value,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Invalid username or password");
        }

        setMessage("Login successful. Opening your dashboard...", "success");

        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 500);
    } catch (error) {
        console.error("Login error:", error);

        setMessage(error.message || "Unable to sign in");
    } finally {
        setLoading(false);
    }
}

passwordToggle.addEventListener("click", togglePasswordVisibility);

loginForm.addEventListener("submit", loginUser);