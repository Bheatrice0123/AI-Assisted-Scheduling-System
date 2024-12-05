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
        // If there are already sections, show an error message and stop the process
        alert(`Error: Sections already exist for ${yearLevelSelected} ${program}. Please delete them before adding new sections.`);
        return;
    }

    // Confirm the section generation action
    if (!confirm(`Generate sections for ${numStudents} students in ${program}, ${yearLevelSelected}?`)) {
        return;  // If user cancels, stop the process
    }

    // Mapping year level and program shorthand
    const yearLevelMapping = {
        '1st Year': 1,
        '2nd Year': 2,
        '3rd Year': 3,
        '4th Year': 4
    };

    const programMapping = {
        'BSA': 'BSA',
        'BSBA-F': 'BAF',
        'BSBA-M': 'BAM'
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
        // Reference to the Sections sub-collection inside Section_CBAA under Section_Data
        const sectionCBAACollection = collection(db, 'Section_Data', 'Section_CBAA', 'Sections');
        console.log("Section_CBAA -> Sections sub-collection reference: ", sectionCBAACollection); // Debugging output
    
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
            const sectionDocRef = doc(db, 'Section_Data', 'Section_CBAA', 'Sections', sectionName);
    
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
        alert('Success: Sections have been generated successfully!');  // Success message
        document.getElementById('courseSectionForm').reset();  // Reset the form after submission
        updateTable(sectionNames, program, yearLevelSelected);
    
    } catch (error) {
        alert('Error: Unable to generate sections. Please try again.');
        console.error("Error adding sections: ", error);
    }
});

// Function to check if sections already exist for a given program and year level
async function checkExistingSections(program, yearLevelSelected) {
    try {
        const sectionsCollection = collection(db, 'Section_Data', 'Section_CBAA', 'Sections');
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

// Function to delete a row from the table and Firestore
async function deleteRow(button, sectionName) {
    if (!confirm(`Are you sure you want to delete section ${sectionName}?`)) {
        return;  // If user cancels, stop the deletion
    }

    const row = button.parentNode.parentNode.parentNode;  // Get the row to remove

    try {
        // Get the sections collection and fetch all documents
        const querySnapshot = await getDocs(collection(db, 'Section_Data', 'Section_CBAA', 'Sections'));
        
        // Loop through the documents to find the one with the matching section name
        querySnapshot.forEach(async (docSnapshot) => {
            if (docSnapshot.data().section_name === sectionName) {
                // Get a reference to the document and delete it using deleteDoc
                const docRef = docSnapshot.ref;
                await deleteDoc(docRef);
                console.log(`Section ${sectionName} deleted successfully from Firestore.`);

                // Remove the corresponding row from the table
                row.remove();
                alert(`Success: Section ${sectionName} has been deleted.`);
            }
        });
        
    } catch (error) {
        alert(`Error: Unable to delete section ${sectionName}.`);
        console.error("Error finding or deleting section: ", error);
    }
}

async function loadSections() {
    try {
        const sectionsCollection = collection(db, 'Section_Data', 'Section_CBAA', 'Sections');
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
