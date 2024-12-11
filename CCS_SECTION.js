import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc, setDoc, getDocs, doc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { deleteDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js"; // Import deleteDoc

// Firebase configuration object (kept the same)
const firebaseConfig = {
    apiKey: "AIzaSyAwdsk_UoNooIKhslUSCi8y1xeBq38sSTA",
    authDomain: "webscheduler-e7d82.firebaseapp.com",
    projectId: "webscheduler-e7d82",
    storageBucket: "webscheduler-e7d82.appspot.com",
    messagingSenderId: "924855937810",
    appId: "1:924855937810:web:a082d08353fc348c5d21cb",
    measurementId: "G-HB7GS4YWVW"
};

// Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.getElementById('courseSectionForm').addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent form submission

    const numStudents = parseInt(document.getElementById('numStudents').value);
    const program = document.getElementById('programSelect').value;
    const yearLevelSelected = document.getElementById('yearLevel').value;

    const sectionConfirmDialog = document.getElementById('sectionConfirmDialog');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmYes = document.getElementById('confirmYes');
    const confirmCancel = document.getElementById('confirmCancel');

    // Set the confirmation message dynamically
    confirmMessage.textContent = `Generate sections for ${numStudents} students in ${program}, ${yearLevelSelected}?`;

    // Show the confirmation dialog
    sectionConfirmDialog.showModal();

    // Wait for user confirmation
    const userConfirmed = await new Promise((resolve) => {
        confirmYes.onclick = () => {
            resolve(true);
            sectionConfirmDialog.close();
        };
        confirmCancel.onclick = () => {
            resolve(false);
            sectionConfirmDialog.close();
        };
    });

    if (!userConfirmed) {
        return; // Stop process if the user cancels
    }

    // Proceed with section generation
    try {
        const maxStudentsPerSection = 50;
        const minStudentsPerSection = 25;
        let numSections = Math.floor(numStudents / maxStudentsPerSection);
        let remainingStudents = numStudents % maxStudentsPerSection;

        // Adjust for remaining students
        if (remainingStudents > 0 && remainingStudents < minStudentsPerSection) {
            numSections--;
            remainingStudents += maxStudentsPerSection;
        }
        if (remainingStudents > 0) {
            numSections++;
        }

        const sectionNames = [];
        const yearLevelMapping = { '1st Year': 1, '2nd Year': 2, '3rd Year': 3, '4th Year': 4 };
        const programMapping = { 'BSCS': 'CS', 'BSIT': 'IT' };
        const yearLevel = yearLevelMapping[yearLevelSelected];
        const programShort = programMapping[program];

        // Generate section names
        for (let i = 0; i < numSections; i++) {
            const sectionLetter = String.fromCharCode(65 + i); // A, B, C...
            sectionNames.push(`${yearLevel}${programShort}-${sectionLetter}`);
        }

        // Add the sections to the database
        for (const section of sectionNames) {
            await addDoc(collection(db, 'Section_Data', 'Section_CCS', 'Sections'), {
                program: program,
                year_level: yearLevelSelected,
                section_name: section,
            });
        }

        // Update the table
        updateTable(sectionNames, program, yearLevelSelected);

        // Display success dialog
        const successDialog = document.getElementById('successDialog');
        const successMessage = document.getElementById('successMessage');
        successMessage.textContent = 'Success: Sections have been generated successfully!';
        successDialog.showModal();

        document.getElementById('successClose').onclick = () => {
            successDialog.close();
            document.getElementById('courseSectionForm').reset(); // Reset form
        };

    } catch (error) {
        console.error('Error:', error);
        alert('Error: Unable to generate sections. Please try again.');
    }
});


// Function to check if sections already exist for a given program and year level
async function checkExistingSections(program, yearLevelSelected) {
    try {
        const sectionsCollection = collection(db, 'Section_Data', 'Section_CCS', 'Sections');
        const snapshot = await getDocs(sectionsCollection);

        const existingSections = [];
        snapshot.forEach((sectionDoc) => {
            const data = sectionDoc.data();
            if (data.program === program && data.year_level === yearLevelSelected) {
                existingSections.push(data.section_name);
            }
        });

        return existingSections;

    } catch (error) {
        console.error("Error checking existing sections: ", error);
        return [];
    }
}

// Function to update the table with new sections
function updateTable(sectionNames, program, yearLevelSelected) {
    const table = document.getElementById('courseTable').getElementsByTagName('tbody')[0];

    // Add each section to the table, one per row (append rows, don't clear previous ones)
    sectionNames.forEach(section => {
        const newRow = table.insertRow();
        
        // Insert Program, Year Level, and Section into the table
        newRow.insertCell(0).innerText = program; // Program (BSCS or BSIT)
        newRow.insertCell(1).innerText = yearLevelSelected; // Year Level (e.g., 1st Year)
        newRow.insertCell(2).innerText = section; // Section (e.g., 1CS-A, 1CS-B, etc.)

        // Create action buttons (Delete)
        const optionsCell = newRow.insertCell(3);

        const deleteButton = document.createElement('button');
        deleteButton.innerText = 'Delete';
        deleteButton.className = 'delete-button';
        deleteButton.onclick = function() { deleteRow(this, section); };

        // Append buttons to the cell
        const actionButtons = document.createElement('div');
        actionButtons.className = 'action-buttons';
        actionButtons.appendChild(deleteButton);

        optionsCell.appendChild(actionButtons);
    });
}

// Function to handle deleting a section when the "Delete" button is clicked
async function deleteRow(button, sectionName) {
    const deleteSection = document.getElementById('deleteSection');
    const sectionNameSpan = document.getElementById('sectionName');
    const deletingYes = document.getElementById('deletingYes');
    const deletingCancel = document.getElementById('deletingCancel');

    // Set the section name in the dialog
    sectionNameSpan.textContent = sectionName;

    // Show the dialog
    deleteSection.showModal();

    // Return a promise that resolves when the user makes a choice
    const userConfirmed = await new Promise((resolve) => {
        deletingYes.onclick = () => {
            resolve(true); // User confirmed
            deleteSection.close();
        };

        deletingCancel.onclick = () => {
            resolve(false); // User canceled
            deleteSection.close();
        };
    });

    // If user cancels, stop the deletion
    if (!userConfirmed) {
        return;
    }

    // Proceed with the deletion logic (delete from Firestore and remove the row)
    try {
        // Get the sections collection and fetch all documents
        const querySnapshot = await getDocs(collection(db, 'Section_Data', 'Section_CCS', 'Sections'));

        // Loop through the documents to find the one with the matching section name
        querySnapshot.forEach(async (docSnapshot) => {
            if (docSnapshot.data().section_name === sectionName) {
                // Get a reference to the document and delete it using deleteDoc
                const docRef = docSnapshot.ref;
                await deleteDoc(docRef);
                console.log(`Section ${sectionName} deleted successfully from Firestore.`);

                // Remove the corresponding row from the table
                const row = button.closest('tr'); // Get the row to remove
                row.remove();

                // Display success message
                const successDialog = document.getElementById('deletionDialog');
                const deletionMessage = document.getElementById('deletionMessage');
                deletionMessage.textContent = `Section ${sectionName} has been successfully deleted.`;
                successDialog.showModal();

                // Close success dialog on button click
                document.getElementById('deletionClose').onclick = () => {
                    successDialog.close();
                };
            }
        });

    } catch (error) {
        alert(`Error: Unable to delete section ${sectionName}.`);
        console.error("Error finding or deleting section: ", error);
    }
}

async function loadSections() {
    try {
        const sectionsCollection = collection(db, 'Section_Data', 'Section_CCS', 'Sections');
        const snapshot = await getDocs(sectionsCollection);
        
        const sectionNames = [];
        let program = '';
        let yearLevelSelected = '';

        snapshot.forEach((sectionDoc) => {
            const data = sectionDoc.data();
            sectionNames.push(data.section_name);
            program = data.program;
            yearLevelSelected = data.year_level;
        });

        // Call updateTable once with all the collected sections
        updateTable(sectionNames, program, yearLevelSelected);

    } catch (error) {
        console.error("Error loading sections: ", error);
    }
}

window.addEventListener('DOMContentLoaded', (event) => {
    loadSections(); // Fetch and display the existing sections when the page loads
});
