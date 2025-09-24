document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                messageDiv.innerHTML = `
                    <div class="alert alert-success alert-dismissible fade show" role="alert">
                        ${data.newAccount ? 'New account created! ' : ''}Login successful. Redirecting...
                    </div>
                `;
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            } else {
                messageDiv.innerHTML = `
                    <div class="alert alert-danger alert-dismissible fade show" role="alert">
                        ${data.message}
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Login error:', error);
            messageDiv.innerHTML = `
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    Network error. Please try again.
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
        }
    });
});