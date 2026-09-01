const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const validationError = validateLogin(username, password);

if (validationError) {
    message.textContent = validationError;
    return;
}
    function validateLogin(username, password) {
    if (!username.trim()) {
        return "Username is required.";
    }

    if (!password) {
        return "Password is required.";
    }

    return null;
}
    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                username,
                password,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            message.textContent = data.error;
            return;
        }

        message.textContent = "Login successful!";

        window.location.href = "/dashboard";
    } catch (error) {
        console.error("Login error:", error);
        message.textContent = "Unable to connect to server.";
    }
});