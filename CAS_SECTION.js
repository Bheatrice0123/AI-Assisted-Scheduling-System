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

document.getElementById('courseSectionForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const numStudents = parseInt(document.getElementById('numStudents').value, 10);
    const program = document.getElementById('programSelect').value;
    const yearLevelSelected = document.getElementById('yearLevel').value;

    if (!numStudents || isNaN(numStudents) || numStudents < 25) {
        alert('Error: Please enter a valid number of students (minimum 25).');
        return;
    }

    // Before generating sections, check if sections already exist for the selected program and year level
    const existingSections = await checkExistingSections(program, yearLevelSelected);

    if (existingSections.length > 0) {
    const errorDialog = document.getElementById('errorDialog');
    const errorMessage = document.getElementById('errorMessage');
    const errorClose = document.getElementById('errorClose');

    // Set the error message in the dialog
    errorMessage.textContent = `Error: Sections already exist for ${yearLevelSelected} ${program}. Please delete them before adding new sections.`;

    // Show the dialog
    errorDialog.showModal();

    // Close the dialog when the close button is clicked
    errorClose.onclick = () => {
        errorDialog.close();
    };

    // Call the confirmation dialog
    const proceed = await sectionConfirmDialog(numStudents, program, yearLevelSelected);
    if (!proceed) {
        console.log("User canceled section generation.");
        return; // Stop the process if the user cancels
    }

    // Stop the process
    //return;
}

function showSuccessDialog(message) {
    const successDialog = document.getElementById('successDialog');
    const successMessage = document.getElementById('successMessage');
    const successClose = document.getElementById('successClose');

    // Set the success message dynamically
    successMessage.textContent = message;

    // Show the dialog
    successDialog.showModal();

    // Close the dialog when the close button is clicked
    successClose.onclick = () => {
        successDialog.close();
    };
}

async function sectionConfirmDialog(numStudents, program, yearLevelSelected) {
    const sectionConfirmDialog = document.getElementById('sectionConfirmDialog');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmYes = document.getElementById('confirmYes');
    const confirmCancel = document.getElementById('confirmCancel');

    // Set the confirmation message dynamically
    confirmMessage.textContent = `Generate sections for ${numStudents} students in ${program}, ${yearLevelSelected}?`;

    // Show the dialog
    sectionConfirmDialog.showModal();

    // Return a promise that resolves when the user makes a choice
    const userConfirmed = await new Promise((resolve) => {
        confirmYes.onclick = () => {
            resolve(true); // User confirmed
            sectionConfirmDialog.close();
        };

        confirmCancel.onclick = () => {
            resolve(false); // User canceled
            sectionConfirmDialog.close();
        };
    });

    // If user cancels, stop the process
    if (!userConfirmed) {
        return false;
    }

    // Proceed with section generation
    return true;
}


    // Mapping year level and program shorthand
    const yearLevelMapping = {
        '1st Year': 1,
        '2nd Year': 2,
        '3rd Year': 3,
        '4th Year': 4
    };

    const programMapping = {
        'BSPSY': 'PSY'
    };

    const yearLevel = yearLevelMapping[yearLevelSelected];
    const programShort = programMapping[program];

    // Section calculation logic
    const maxStudentsPerSection = 50;
    const minStudentsPerSection = 25;
    let numSections = Math.floor(numStudents / maxStudentsPerSection);
    let remainingStudents = numStudents % maxStudentsPerSection;

    // Adjust number of sections if remaining students are fewer than 25
    if (remainingStudents > 0 && remainingStudents < minStudentsPerSection) {
        numSections--; // Reduce one section
        remainingStudents += maxStudentsPerSection; // Add remaining students to other sections
    }

    // Only increment numSections if there are remaining students greater than 0
    if (remainingStudents > 0) {
        numSections++;
    }

    const sectionNames = [];
    
    // Generate section names
    for (let i = 0; i < numSections; i++) {
        const sectionLetter = String.fromCharCode(65 + i); // Generates letters A, B, C, etc.
        const sectionName = `${yearLevel}${programShort}-${sectionLetter}`;
        sectionNames.push(sectionName);
    }

    try {
        // Reference to the Sections sub-collection inside Section_CAS under Section_Data
        const sectionCASCollection = collection(db, 'Section_Data', 'Section_CAS', 'Sections');
        console.log("Section_CAS -> Sections sub-collection reference: ", sectionCASCollection); // Debugging output
    
        // Define studentsPerSection array to store the number of students for each section
        const studentsPerSection = new Array(numSections).fill(maxStudentsPerSection);
        
        // Adjust the last section to account for any remaining students
        if (remainingStudents > 0) {
            studentsPerSection[studentsPerSection.length - 1] = remainingStudents;
        }
    
        // Add sections as documents in the 'Sections' sub-collection
        const sectionPromises = sectionNames.map(async (sectionName, index) => {
            const studentsInSection = studentsPerSection[index];  // Assign students per section from the array
            console.log(`Adding section: ${sectionName} with ${studentsInSection} students.`); // Debugging output
    
            // Create a document reference with the section name as the document ID
            const sectionDocRef = doc(db, 'Section_Data', 'Section_CAS', 'Sections', sectionName);
    
            // Use setDoc to set the document with the section name as the document ID
            return await setDoc(sectionDocRef, {
                section_name: sectionName,
                program: program,
                year_level: yearLevelSelected,
                student_count: studentsInSection
            });
        });
    
        // Wait for all sections to be added
        await Promise.all(sectionPromises);
        showSuccessDialog(`Sections have been successfully generated for ${numStudents} students in ${program}, ${yearLevelSelected}.`);
        // alert('Success: Sections have been generated successfully!');  // Success message
        //updateTable(sectionDetails);

        await loadSections();

        document.getElementById('courseSectionForm').reset();  // Reset the form after submission
    
    } catch (error) {
        //alert('Error: Unable to generate sections. Please try again.');
        console.error("Error adding sections: ", error);
    }
});

// Function to check if sections already exist for a given program and year level
async function checkExistingSections(program, yearLevelSelected) {
    try {
        const sectionsCollection = collection(db, 'Section_Data', 'Section_CAS', 'Sections');
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
// Update updateTable to accept the new data structure
function updateTable(sectionDetails) {
    const table = document.getElementById('courseTable').getElementsByTagName('tbody')[0];

    // Clear existing rows to avoid duplicates
    table.innerHTML = '';

    // Add each section to the table, one per row
    sectionDetails.forEach(detail => {
        const newRow = table.insertRow();
        
        // Insert Program, Year Level, and Section into the table
        newRow.insertCell(0).innerText = detail.program;
        newRow.insertCell(1).innerText = detail.year_level;
        newRow.insertCell(2).innerText = detail.section_name;
        newRow.insertCell(3).innerText = detail.student_count;

        // Create action buttons (Delete)
        const optionsCell = newRow.insertCell(4);

        const deleteButton = document.createElement('button');
        deleteButton.innerText = 'Delete';
        deleteButton.className = 'delete-button';
        deleteButton.onclick = function() { deleteRow(this, detail.section_name); };

        // Append buttons to the cell
        const actionButtons = document.createElement('div');
        actionButtons.className = 'action-buttons';
        actionButtons.appendChild(deleteButton);

        optionsCell.appendChild(actionButtons);
    });
}

async function deleteRow(button, sectionName) {
    const deleteSection = document.getElementById('deleteSection');
    const sectionNameSpan = document.getElementById('sectionName');
    const confirmYes = document.getElementById('confirmYes');
    const confirmCancel = document.getElementById('confirmCancel');

    // Set the section name in the dialog
    sectionNameSpan.textContent = sectionName;

    // Show the dialog
    deleteSection.showModal();

    // Return a promise that resolves when the user makes a choice
    const userConfirmed = await new Promise((resolve) => {
        confirmYes.onclick = () => {
            resolve(true); // User confirmed
            deleteSection.close();
        };

        confirmCancel.onclick = () => {
            resolve(false); // User canceled
            deleteSection.close();
        };
    });

    // If user cancels, stop the deletion
    if (!userConfirmed) {
        return;
    }

    // Proceed with the deletion logic (e.g., delete from Firestore)
    console.log(`Deleting section: ${sectionName}`);
    // Add your Firestore deletion logic here


    const row = button.parentNode.parentNode.parentNode;  // Get the row to remove

    try {
        // Get the sections collection and fetch all documents
        const querySnapshot = await getDocs(collection(db, 'Section_Data', 'Section_CAS', 'Sections'));
        
        // Loop through the documents to find the one with the matching section name
        querySnapshot.forEach(async (docSnapshot) => {
            async function showDeletionSuccessDialog(sectionName) {
                const deletionDialog = document.getElementById('deletionDialog');
                const deletionMessage = document.getElementById('deletionMessage');
                const deletionClose = document.getElementById('deletionClose');
            
                // Set the success message dynamically
                deletionMessage.textContent = `Success: Section ${sectionName} has been deleted.`;
            
                // Show the dialog
                deletionDialog.showModal();
            
                // Close the dialog when the close button is clicked
                return new Promise((resolve) => {
                    deletionClose.onclick = () => {
                        deletionDialog.close();
                        resolve(); // Resolve the promise when the dialog is closed
                    };
                });
            }
            
            // Example usage
            if (docSnapshot.data().section_name === sectionName) {
                // Get a reference to the document and delete it using deleteDoc
                const docRef = docSnapshot.ref;
                await deleteDoc(docRef);
                console.log(`Section ${sectionName} deleted successfully from Firestore.`);
            
                // Remove the corresponding row from the table
                row.remove();
            
                // Show success dialog
                await showDeletionSuccessDialog(sectionName);
            }
        })
            
        
    } catch (error) {
        alert(`Error: Unable to delete section ${sectionName}.`);
        console.error("Error finding or deleting section: ", error);
    }
}

async function loadSections() {
    try {
        const sectionsCollection = collection(db, 'Section_Data', 'Section_CAS', 'Sections');
        const snapshot = await getDocs(sectionsCollection);
        
        // Store each section’s details as an object in the array
        const sectionDetails = [];
        
        snapshot.forEach((sectionDoc) => {
            const data = sectionDoc.data();
            sectionDetails.push({
                section_name: data.section_name,
                program: data.program,
                year_level: data.year_level,
                student_count: data.student_count
            });
        });

        // Call updateTable with all the collected section details
        updateTable(sectionDetails);

    } catch (error) {
        console.error("Error loading sections: ", error);
    }
}


window.addEventListener('DOMContentLoaded', (event) => {
    loadSections(); // Fetch and display the existing sections when the page loads
});