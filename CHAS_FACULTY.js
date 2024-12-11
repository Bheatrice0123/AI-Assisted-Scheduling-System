// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAwdsk_UoNooIKhslUSCi8y1xeBq38sSTA",
    authDomain: "webscheduler-e7d82.firebaseapp.com",
    projectId: "webscheduler-e7d82",
    storageBucket: "webscheduler-e7d82.appspot.com",
    messagingSenderId: "924855937810",
    appId: "1:924855937810:web:a082d08353fc348c5d21cb",
    measurementId: "G-HB7GS4YWVW"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', function () {
    const formContainer = document.getElementById('formContainer');
    const addFacultyBtn = document.getElementById('addFacultyBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const facultyForm = document.getElementById('FacultyForm');
    const facultyTableBody = document.querySelector('#FacultyTable tbody');
    const searchFaculty = document.getElementById('searchFaculty');
    let editingDocId = null; // To track the document being edited

    // Real-time listener for faculty data
    setupRealTimeListener();

    // Show form for adding a new faculty
    addFacultyBtn.addEventListener('click', function () {
        formContainer.style.display = 'block';
        facultyForm.reset();
        editingDocId = null; // Reset editing document ID
    });

    // Hide form when cancel button is clicked
    cancelBtn.addEventListener('click', function () {
        formContainer.style.display = 'none';
    });

    // Submit form data
    facultyForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const name = document.getElementById('name').value.trim();
        const status = document.getElementById('status').value;
        const bachelor = document.getElementById('bachelor').value;
        const masters = document.getElementById('masters').value;
        const doctorate = document.getElementById('doctorate').value;

        // Get specialization courses
        const specialization = [
            {
                course_code: document.getElementById('courseCode1').value,
                course_title: document.getElementById('courseTitle1').value
            },
            {
                course_code: document.getElementById('courseCode2').value,
                course_title: document.getElementById('courseTitle2').value
            },
            {
                course_code: document.getElementById('courseCode3').value,
                course_title: document.getElementById('courseTitle3').value
            }
        ];

        // Determine max_hours based on status
        const maxHours = status === 'Full Time' ? 21 : 25;

        // Basic form validation
        if (!name) {
            alert("Full Name is required.");
            return;
        }

        const facultyData = {
            name,
            status: status === 'Full Time' ? true : false,
            bachelor,
            masters,
            doctorate,
            specialization,   // Save specialization array
            isActive: true,   // Automatically set faculty as active
            department: 'CHAS', // Automatically set department as "CHAS"
            max_hours: maxHours // Automatically set max_hours based on status
        };

        if (editingDocId) {
            // Update existing faculty in Firestore
            db.collection('Faculty_Data')
              .doc('CHAS')
              .collection('CHAS_Faculty')
              .doc(editingDocId)
              .update(facultyData)
              .then(() => {
                  // The real-time listener will handle the UI update
                  formContainer.style.display = 'none';
              })
              .catch((error) => {
                  console.error("Error updating faculty: ", error);
                  alert("Failed to update faculty. Please try again.");
              });
        } else {
            // Add new faculty to Firestore with custom ID
            db.collection('Faculty_Data')
              .doc('CHAS')
              .collection('CHAS_Faculty')
              .get()
              .then((snapshot) => {
                  const count = snapshot.size; // Get the number of existing documents
                  const nextId = `CHASFaculty_${String(count + 1).padStart(3, '0')}`; // Generate next ID (CHASFaculty_001, etc.)

                  db.collection('Faculty_Data')
                    .doc('CHAS')
                    .collection('CHAS_Faculty')
                    .doc(nextId) // Use the custom generated ID
                    .set(facultyData)
                    .then(() => {
                        formContainer.style.display = 'none';

                    })
                    .catch((error) => {
                        console.error("Error adding faculty: ", error);
                        alert("Failed to add faculty. Please try again.");
                    });
              })
              .catch((error) => {
                  console.error("Error getting document count: ", error);
                  alert("Failed to get faculty data. Please try again.");
              });
        }
    });
    /**
     * Sets up a real-time listener to the CHAS_Faculty collection.
     * This function ensures that any changes in Firestore are immediately reflected in the UI.
     */
    function setupRealTimeListener() {
        db.collection('Faculty_Data')
          .doc('CHAS')
          .collection('CHAS_Faculty')
          .onSnapshot((snapshot) => {
              snapshot.docChanges().forEach((change) => {
                  const doc = change.doc;
                  const data = doc.data();
                  const docId = doc.id;

                  if (change.type === "added") {
                      addFacultyRow(docId, data);
                  }
                  if (change.type === "modified") {
                      updateFacultyRow(docId, data);
                      alert('Faculty details updated successfully.');
                  }
                  if (change.type === "removed") {
                      removeFacultyRow(docId);
                      alert('The Faculty is removed successfully.');
                  }
              });
          }, (error) => {
              console.error("Real-time listener error: ", error);
              alert("Failed to listen for faculty data changes.");
          });
    }

    /**
     * Adds a new row to the faculty table.
     * @param {string} id - Firestore document ID.
     * @param {object} data - Faculty data object.
     */
    function addFacultyRow(id, data) {
        const newRow = facultyTableBody.insertRow();
        newRow.setAttribute('data-id', id); // Set a data attribute for easy access

        // NO. ID (Using Firestore Document ID)
        newRow.insertCell(0).textContent = id;

        // Full Name
        newRow.insertCell(1).textContent = data.name || '';

        // Status
        newRow.insertCell(2).textContent = data.status ? 'Full Time' : 'Part Time';

        // Bachelor Degree
        newRow.insertCell(3).textContent = data.bachelor || '';

        // Masters
        newRow.insertCell(4).textContent = data.masters || '';

        // Doctorate
        newRow.insertCell(5).textContent = data.doctorate || '';

        // Options (Edit & Delete Buttons)
        const optionsCell = newRow.insertCell(6);
        optionsCell.className = 'options-cell';

        const viewBtn = document.createElement('button');
        viewBtn.textContent = 'View';
        viewBtn.className = 'viewBtn';
        viewBtn.onclick = function () {
            viewRow(data);
        };
        optionsCell.appendChild(viewBtn);

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.className = 'updateBtn';
        editBtn.onclick = function () {
            editRow(id, data);
        };
        optionsCell.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'deleteBtn';
        deleteBtn.onclick = function () {
            deleteFaculty(id);
        };
        optionsCell.appendChild(deleteBtn);
    }

    /**
     * Updates an existing row in the faculty table.
     * @param {string} id - Firestore document ID.
     * @param {object} data - Updated faculty data object.
     */
    function updateFacultyRow(id, data) {
        const row = document.querySelector(`tr[data-id="${id}"]`);
        if (row) {
            row.cells[1].textContent = data.name || '';
            row.cells[2].textContent = data.status ? 'Full Time' : 'Part Time';
            row.cells[3].textContent = data.bachelor || '';
            row.cells[4].textContent = data.masters || '';
            row.cells[5].textContent = data.doctorate || '';
            // No need to update Options buttons as they remain the same
        }
    }

    /**
     * Removes a row from the faculty table.
     * @param {string} id - Firestore document ID.
     */
    function removeFacultyRow(id) {
        const row = document.querySelector(`tr[data-id="${id}"]`);
        if (row) {
            facultyTableBody.removeChild(row);
        }
    }

    /**
     * Edits a faculty member by populating the form with existing data.
     * @param {string} docId - Firestore document ID.
     * @param {object} data - Existing faculty data object.
     */
    function editRow(docId, data) {
        formContainer.style.display = 'block';
        document.getElementById('name').value = data.name || '';
        document.getElementById('status').value = data.status ? 'Full Time' : 'Part Time';
        document.getElementById('bachelor').value = data.bachelor || '';
        document.getElementById('masters').value = data.masters || '';
        document.getElementById('doctorate').value = data.doctorate || '';
        editingDocId = docId;

    }

    /**
     * Deletes a faculty member from Firestore.
     * @param {string} docId - Firestore document ID.
     */
    function deleteFaculty(docId) {
        if (confirm("Are you sure you want to delete this faculty member?")) {
            db.collection('Faculty_Data')
              .doc('CHAS')
              .collection('CHAS_Faculty')
              .doc(docId)
              .delete()
              .then(() => {
                  // The real-time listener will handle the UI update
              })
              .catch((error) => {
                  console.error("Error deleting faculty: ", error);
                  alert("Failed to delete faculty. Please try again.");
              });
        }
    }

    function viewRow(data) {
        const specialization = data.specialization || [];
        const pastCourses = data.past_courses || [];
    
        // Format specialization details
        let specializationDetails = '';
        if (specialization.length > 0) {
            specializationDetails = 'Specialization Courses:\n';
            specialization.forEach((course, index) => {
                specializationDetails += `  ${index + 1}. ${course.course_code} - ${course.course_title}\n`;
            });
        } else {
            specializationDetails = 'Specialization Courses: None\n';
        }
    
        // Format past courses details
        let pastCoursesDetails = '';
        if (pastCourses.length > 0) {
            pastCoursesDetails = 'Past Courses:\n';
            pastCourses.forEach((course, index) => {
                const courseCode = course.course_code || 'N/A';
                const courseTitle = course.course_title || 'N/A';
                const program = course.program || 'N/A';
                const academicYear = course.academic_year || 'N/A';
                
                pastCoursesDetails += `  ${index + 1}. ${courseCode} - ${courseTitle} (Program: ${program}, AY: ${academicYear})\n`;
            });
        } else {
            pastCoursesDetails = 'Past Courses: None\n';
        }
    
        // Combine all details to show in alert
        alert(`Faculty Details:
        
        Full Name: ${data.name}
        Status: ${data.isActive ? 'Active' : 'Inactive'}
        Bachelor Degree: ${data.bachelor}
        Masters: ${data.masters || 'N/A'}
        Doctorate: ${data.doctorate || 'N/A'}
        
        ${specializationDetails}
        ${pastCoursesDetails}`);
    }

    /**
     * Filters the faculty table based on the search input.
     */
    searchFaculty.addEventListener('input', function () {
        const searchTerm = searchFaculty.value.toLowerCase();
        const rows = facultyTableBody.getElementsByTagName('tr');
        for (let i = 0; i < rows.length; i++) {
            const cells = rows[i].getElementsByTagName('td');
            let found = false;
            for (let j = 0; j < cells.length - 1; j++) { // Exclude the 'Options' column
                if (cells[j].textContent.toLowerCase().includes(searchTerm)) {
                    found = true;
                    break;
                }
            }
            rows[i].style.display = found ? '' : 'none';
        }
    });
});


document.addEventListener('DOMContentLoaded', () => {
    const viewButtons = document.querySelectorAll('.viewBtn');

    viewButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const row = event.target.closest('tr');
            const fullName = row.cells[1].innerText; // Assuming Full Name is the 2nd cell
            const status = row.cells[2].innerText; // Assuming Status is the 3rd cell
            const bachelor = row.cells[3].innerText; // Assuming Bachelor Degree is the 4th cell
            const masters = row.cells[4].innerText; // Assuming Masters is the 5th cell
            const doctorate = row.cells[5].innerText; // Assuming Doctorate is the 6th cell
            
            alert(`Faculty Details:\n\nFull Name: ${fullName}\nStatus: ${status}\nBachelor Degree: ${bachelor}\nMasters: ${masters}\nDoctorate: ${doctorate}`);
        });
    });
});
