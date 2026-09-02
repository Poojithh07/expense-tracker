const registerForm = document.getElementById("registerForm");
const fullNameInput = document.getElementById("fullName");
const nicknameInput = document.getElementById("nickname");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");

const passwordToggle = document.getElementById("passwordToggle");
const confirmPasswordToggle = document.getElementById(
    "confirmPasswordToggle"
);

const passwordStrength = document.getElementById("passwordStrength");
const strengthText = document.getElementById("strengthText");
const messageElement = document.getElementById("message");
const registerButton = document.getElementById("registerButton");

function setMessage(message, type = "error") {
    messageElement.textContent = message;
    messageElement.dataset.type = type;
}

function setLoading(isLoading) {
    registerButton.disabled = isLoading;
    registerButton.classList.toggle("is-loading", isLoading);
}

function togglePasswordVisibility(input, button) {
    const isPassword = input.type === "password";

    input.type = isPassword ? "text" : "password";
    button.textContent = isPassword ? "Hide" : "Show";
    button.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
    button.setAttribute("aria-pressed", String(isPassword));
}

function calculatePasswordStrength(password) {
    if (!password) {
        return {
            level: 0,
            text: "Use at least 8 characters",
        };
    }

    let score = 0;

    if (password.length >= 8) {
        score += 1;
    }

    if (password.length >= 12) {
        score += 1;
    }

    if (/[A-Z]/.test(password)) {
        score += 1;
    }

    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) {
        score += 1;
    }

    const strength = {
        1: "Weak password",
        2: "Fair password",
        3: "Good password",
        4: "Strong password",
    };

    return {
        level: score,
        text: strength[score] || "Use at least 8 characters",
    };
}

function updatePasswordStrength() {
    const result = calculatePasswordStrength(passwordInput.value);

    passwordStrength.dataset.level = String(result.level);
    strengthText.textContent = result.text;
}
function updatePasswordMatch() {
    if (!confirmPasswordInput.value) {
        confirmPasswordInput.setCustomValidity("");
        return;
    }

    if (passwordInput.value !== confirmPasswordInput.value) {
        confirmPasswordInput.setCustomValidity(
            "Passwords do not match"
        );
        return;
    }

    confirmPasswordInput.setCustomValidity("");
}

function validateForm() {
    const fullName = fullNameInput.value.trim();
    const nickname = nicknameInput.value.trim();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!fullName) {
        return "Full name is required";
    }

    if (fullName.length > 100) {
        return "Full name must be 100 characters or fewer";
    }

    if (!nickname) {
        return "Nickname is required";
    }

    if (nickname.length > 50) {
        return "Nickname must be 50 characters or fewer";
    }

    if (!username) {
        return "Username is required";
    }

    if (username.length > 50) {
        return "Username must be 50 characters or fewer";
    }

    if (password.length < 8) {
        return "Password must be at least 8 characters";
    }

    if (password.length > 128) {
        return "Password must be 128 characters or fewer";
    }

    if (password !== confirmPassword) {
        return "Passwords do not match";
    }

    return null;
}

async function registerUser(event) {
    event.preventDefault();

    setMessage("");

    const validationError = validateForm();

    if (validationError) {
        setMessage(validationError);
        return;
    }

    setLoading(true);

    try {
        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                fullName: fullNameInput.value.trim(),
                nickname: nicknameInput.value.trim(),
                username: usernameInput.value.trim(),
                password: passwordInput.value,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to create account");
        }

        setMessage(
            "Account created successfully. Redirecting to login...",
            "success"
        );

        registerForm.reset();
        updatePasswordStrength();

        setTimeout(() => {
            window.location.href = "login.html";
        }, 900);
    } catch (error) {
        console.error("Registration error:", error);

        setMessage(error.message || "Unable to create account");
    } finally {
        setLoading(false);
    }
}

passwordToggle.addEventListener("click", () => {
    togglePasswordVisibility(passwordInput, passwordToggle);
});
confirmPasswordToggle.addEventListener("click", () => {
    togglePasswordVisibility(
        confirmPasswordInput,
        confirmPasswordToggle
    );
});

passwordInput.addEventListener("input", () => {
    updatePasswordStrength();
    updatePasswordMatch();
});
confirmPasswordInput.addEventListener(
    "input",
    updatePasswordMatch
);
registerForm.addEventListener("submit", registerUser);

updatePasswordStrength();