function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Check if the error message element already exists
    let errorMessage = document.getElementById('error-message');
    if (!errorMessage) {
        // Create the error message element if it doesn't exist
        errorMessage = document.createElement('div');
        errorMessage.id = 'error-message';
        errorMessage.style.color = 'red';
        errorMessage.style.marginTop = '-17px';
        errorMessage.style.fontFamily = 'Arial, sans-serif';
        errorMessage.style.fontSize = '17px';
        errorMessage.style.textAlign = 'center';
        errorMessage.style.opacity = '1'; // Fully visible
        errorMessage.style.transition = 'opacity 1s ease'; // Smooth fade-out effect
        document.querySelector('.login-container').appendChild(errorMessage);
    }

    // Logic for login validation
    if (email === 'ccs@gmail.com' && password === '12345') {
        window.location.href = 'CCS_CURRICULUM.html'; // Redirect to CCS_COURSE.html for DEAN 1
    } else if (email === 'dean.cas@pnc.edu.ph' && password === 'casdangalngbayan') {
        window.location.href = 'CAS_CURRICULUM.html'; // Redirect to CAS_COURSE.html for DEAN 2
    } else if (email === 'dc.cas@pnc.edu.ph' && password === 'casdangalngbayan') {
        window.location.href = 'CAS_CURRICULUM.html'; // Redirect to CAS_COURSE.html for DEAN 2
    } else if (email === 'coe@gmail.com' && password === '12345') {
        window.location.href = 'COE_CURRICULUM.html'; // Redirect to COE_COURSE.html for DEAN 3
    } else if (email === 'coed@gmail.com' && password === '12345') {
        window.location.href = 'COED_CURRICULUM.html'; // Redirect to COED_COURSE.html for DEAN 4
    } else if (email === 'chas@gmail.com' && password === '12345') {
        window.location.href = 'CHAS_CURRICULUM.html'; // Redirect to CHAS_COURSE.html for DEAN 5
    } else if (email === 'cbaa@gmail.com' && password === '12345') {
        window.location.href = 'CBAA_CURRICULUM.html'; // Redirect to CBAA.html for DEAN 6
    } else if (email === '00001@gmail.com' && password === '12345') {
        window.location.href = 'CCS_PROF_A.AQUINO.html'; // Redirect to CBAA.html for Prof 1
    } else if (email === '00002@gmail.com' && password === '12345') {
        window.location.href = 'CCS_PROF_F.HABLANIDA.html'; // Redirect to CBAA.html for Prof 2
    } else {
        // Set the error message text
        errorMessage.textContent = 'Invalid email or password. Please try again.';
        errorMessage.style.opacity = '3'; // Ensure message is fully visible

        // Fade out the error message after 3 seconds
        setTimeout(() => {
            errorMessage.style.opacity = '0'; // Start fading
        }, 3000);
    }

    return false; // Prevent form submission
}
