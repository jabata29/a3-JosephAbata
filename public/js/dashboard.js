let cars = [];

document.addEventListener('DOMContentLoaded', function() {
    // Display username
    fetch('/api/cars')
        .then(response => {
            if (!response.ok) {
                window.location.href = '/';
                throw new Error('Not authenticated');
            }
            return response.json();
        })
        .then(data => {
            cars = data;
            renderCars();
            updateStats();
        })
        .catch(error => {
            console.error('Error:', error);
            window.location.href = '/';
        });

    // Add car form
    document.getElementById('addForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const model = document.getElementById('model').value;
        const year = document.getElementById('year').value;
        const mpg = document.getElementById('mpg').value;
        const fuelType = document.getElementById('fuelType').value;

        // Get selected features
        const features = [];
        document.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
            features.push(checkbox.value);
        });

        try {
            const response = await fetch('/api/cars', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ model, year, mpg, fuelType, features })
            });

            if (response.ok) {
                // Reset form
                e.target.reset();
                // Reload cars
                loadCars();

                // Show success message
                showAlert('Car added successfully!', 'success');
            } else {
                throw new Error('Failed to add car');
            }
        } catch (error) {
            console.error('Error adding car:', error);
            showAlert('Error adding car. Please try again.', 'danger');
        }
    });

    // Edit car functionality
    document.getElementById('saveEditBtn').addEventListener('click', async function() {
        const carId = document.getElementById('editCarId').value;
        const model = document.getElementById('editModel').value;
        const year = document.getElementById('editYear').value;
        const mpg = document.getElementById('editMpg').value;
        const fuelType = document.getElementById('editFuelType').value;

        try {
            const response = await fetch(`/api/cars/${carId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ model, year, mpg, fuelType })
            });

            if (response.ok) {
                // Close modal
                bootstrap.Modal.getInstance(document.getElementById('editCarModal')).hide();
                // Reload cars
                loadCars();
                showAlert('Car updated successfully!', 'success');
            } else {
                throw new Error('Failed to update car');
            }
        } catch (error) {
            console.error('Error updating car:', error);
            showAlert('Error updating car. Please try again.', 'danger');
        }
    });
});

async function loadCars() {
    try {
        const response = await fetch('/api/cars');
        if (!response.ok) throw new Error('Failed to fetch cars');

        cars = await response.json();
        renderCars();
        updateStats();
    } catch (error) {
        console.error('Error loading cars:', error);
        showAlert('Error loading cars. Please try again.', 'danger');
    }
}

function renderCars() {
    const tbody = document.getElementById('carsTableBody');
    const noCarsMessage = document.getElementById('noCarsMessage');

    if (cars.length === 0) {
        tbody.innerHTML = '';
        noCarsMessage.style.display = 'block';
        return;
    }

    noCarsMessage.style.display = 'none';

    tbody.innerHTML = cars.map(car => `
        <tr>
            <td>${car.model}</td>
            <td>${car.year}</td>
            <td>${car.mpg}</td>
            <td>
                <span class="badge bg-${getFuelTypeBadgeColor(car.fuelType)}">
                    ${car.fuelType.charAt(0).toUpperCase() + car.fuelType.slice(1)}
                </span>
            </td>
            <td>${car.age} years</td>
            <td>
                ${car.features && car.features.length > 0 ?
        car.features.map(feature =>
            `<span class="badge bg-secondary me-1">${feature}</span>`
        ).join('') :
        '<span class="text-muted">None</span>'
    }
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editCar('${car._id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteCar('${car._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function getFuelTypeBadgeColor(fuelType) {
    const colors = {
        gasoline: 'warning',
        diesel: 'dark',
        electric: 'success',
        hybrid: 'info'
    };
    return colors[fuelType] || 'secondary';
}

function updateStats() {
    if (cars.length === 0) {
        document.getElementById('totalCars').textContent = '0';
        document.getElementById('avgMpg').textContent = '0';
        document.getElementById('avgAge').textContent = '0';
        return;
    }

    const totalCars = cars.length;
    const avgMpg = (cars.reduce((sum, car) => sum + car.mpg, 0) / totalCars).toFixed(1);
    const avgAge = (cars.reduce((sum, car) => sum + car.age, 0) / totalCars).toFixed(1);

    document.getElementById('totalCars').textContent = totalCars;
    document.getElementById('avgMpg').textContent = avgMpg;
    document.getElementById('avgAge').textContent = avgAge;
}

async function editCar(carId) {
    const car = cars.find(c => c._id === carId);
    if (!car) return;

    document.getElementById('editCarId').value = carId;
    document.getElementById('editModel').value = car.model;
    document.getElementById('editYear').value = car.year;
    document.getElementById('editMpg').value = car.mpg;
    document.getElementById('editFuelType').value = car.fuelType;

    const modal = new bootstrap.Modal(document.getElementById('editCarModal'));
    modal.show();
}

async function deleteCar(carId) {
    if (!confirm('Are you sure you want to delete this car?')) return;

    try {
        const response = await fetch(`/api/cars/${carId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadCars();
            showAlert('Car deleted successfully!', 'success');
        } else {
            throw new Error('Failed to delete car');
        }
    } catch (error) {
        console.error('Error deleting car:', error);
        showAlert('Error deleting car. Please try again.', 'danger');
    }
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '1060';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alertDiv);

    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 3000);
}