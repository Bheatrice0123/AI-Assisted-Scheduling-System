function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (email === 'ccs@gmail.com' && password === '12345') {
        window.location.href = 'CCS_CURRICULUM.html'; // Redirect to CCS_COURSE.html for DEAN 1
    } else if (email === 'cas@gmail.com' && password === '12345') {
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
        alert('Invalid email or password');
    }

    return false; // Prevent form submission
}