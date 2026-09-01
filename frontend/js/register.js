const registerForm = document.getElementById("registerForm");
const message = document.getElementById("message");

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const validationError = validateRegistration(username, password);

if (validationError) {
    message.textContent = validationError;
    return;
}
    function validateRegistration(username, password) {
    if (!username.trim()) {
        return "Username is required.";
    }

    if (password.length < 8) {
        return "Password must be at least 8 characters.";
    }

    return null;
}
    try {
        const response = await fetch("/api/auth/register", {
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

        message.textContent = "Registration successful!";
        registerForm.reset();
    } catch (error) {
        console.error("Registration error:", error);
        message.textContent = "Unable to connect to server.";
    }
});