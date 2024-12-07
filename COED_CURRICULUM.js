// Import Firebase modules using the Modular SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

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

// Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// AWS Configuration (keep this secure on your server)
AWS.config.update({
    accessKeyId: 'AKIAYQYUAXPWKQ2P7U7U', // Securely store these values
    secretAccessKey: 'R4sXtTcXTUCm9yTtIj+mEm1TThT4kB4zt5//yyaP', // Never expose these keys in production
    region: 'ap-southeast-2'
});

const s3 = new AWS.S3();
const bucketName = 'ucurriculum-s3-storage'; // Replace with your bucket name

// Function to upload parsed CSV data to the Firestore document
async function uploadCSVDataToFirestore(csvData) {
    const docRef = doc(db, "tempCurriculum", "tempCurriculum_COED");

    try {
        await setDoc(docRef, { csvRows: csvData }, { merge: true });
        alert("CSV data uploaded successfully!");
        fetchTempCurriculumData();  // Fetch and display the data after upload
    } catch (error) {
        alert("Error uploading CSV data.");
        console.error("Error uploading CSV data to Firestore:", error);
    }
}

// Function to parse the CSV file
function parseCSV(csvString) {
    return Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true
    }).data; 
}

// Function to validate CSV data
function validateCSVData(csvData, selectedProgram, selectedYear) {
    const firstRow = csvData[0];
    
    if (!firstRow) {
        alert("The CSV file is empty.");
        return false;
    }
    
    const csvProgram = firstRow['Program']?.trim();
    const csvBatch = firstRow['Batch of Curriculum']?.trim();
    
    if (csvProgram !== selectedProgram || csvBatch !== selectedYear) {
        alert(`The uploaded file is incorrect. Program in file: ${csvProgram}, Batch: ${csvBatch}. ` +
              `Expected Program: ${selectedProgram}, Year: ${selectedYear}.`);
        return false;
    }
    
    return true;
}

// Function to fetch and display data from the tempCurriculum_COED document
async function fetchTempCurriculumData() {
    const docRef = doc(db, "tempCurriculum", "tempCurriculum_COED");

    try {
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data().csvRows; // Ensure this field exists
            console.log("Retrieved data:", data);  // Log the retrieved data
            transformAndDisplayTempCurriculumData(data);  // Display the data in the table
        } else {
            alert("No curriculum data found.");
            console.log("No curriculum data found in Firestore."); // Debug
        }
    } catch (error) {
        alert("Error fetching curriculum data.");
        console.error("Error fetching curriculum data:", error);
    }
}

function transformAndDisplayTempCurriculumData(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';  // Clear the table body before populating

    // Populate table rows based on the transformed data
    data.forEach(row => {
        const lectureUnits = Number(row['No. of units on Lecture'] || 0);
        const labUnits = Number(row['No. of units on Laboratory'] || 0);

        function createRow(type) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row['Course Code'] || ''}</td>
                <td>${row['Course Title'] || ''}</td>
                <td>${type}</td>
                <td><input type="number" class="setHours" min="0" value="0"></td>
                <td>${row['Program'] || ''}</td>
                <td>${row['Year Level'] || ''}</td>
                <td>${row['Semester'] || ''}</td>
                <td>${row['Batch of Curriculum'] || ''}</td>
                <td>${row['GenEd'] || ''}</td>
            `;
            return tr;
        }

        // Add rows for lecture and laboratory as needed
        if (lectureUnits > 0) {
            tableBody.appendChild(createRow('Lecture'));
        }
        if (labUnits > 0) {
            tableBody.appendChild(createRow('Laboratory'));
        }
    });
}

// Function to gather data from the table
function gatherTableData() {
    const tableBody = document.getElementById('tableBody');
    const rows = tableBody.getElementsByTagName('tr');
    const curriculumData = [];

    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].getElementsByTagName('td');
        const rowData = {
            'Course Code': cells[0].innerText || '',
            'Course Title': cells[1].innerText || '',
            'Type': cells[2].innerText || '',
            'Set Hours': cells[3].querySelector('input').value || 0,
            'Program': cells[4].innerText || '',
            'Year Level': cells[5].innerText || '',
            'Semester': cells[6].innerText || '',
            'Batch': cells[7].innerText || '',
            'GenEd': cells[8].innerText || ''
        };
        curriculumData.push(rowData);
    }
    console.log("Gathered table data:", curriculumData); // Debug
    return curriculumData;
}

// Function to upload the CSV file to AWS S3
function uploadCSVToS3() {
    const fileInput = document.getElementById('fileUpload');
    const file = fileInput.files[0];

    if (!file) {
        alert("No file selected for S3 upload.");
        console.error("No file selected for S3 upload.");
        return;
    }

    const params = {
        Bucket: bucketName,
        Key: `curriculum-uploads/${file.name}`, // Optional: you can adjust the file path
        Body: file,
        ContentType: 'text/csv' // Ensure the content type is set correctly
    };

    s3.upload(params, function(err, data) {
        if (err) {
            alert("Error uploading file to S3.");
            console.error("Error uploading to S3:", err);
        } else {
            alert("CSV file uploaded to S3 successfully!");
            console.log("File successfully uploaded to S3:", data);
        }
    });
}

// Function to check if curriculum for a specific program and batch already exists
async function checkIfCurriculumExists(program, batch) {
    const curriculumRef = collection(db, "mainCurriculum", "mainCurriculum_COED", program);
    const querySnapshot = await getDocs(curriculumRef);
    
    let curriculumExists = false;
    
    querySnapshot.forEach((doc) => {
        if (doc.id === `${program}Curriculum${batch}`) {
            curriculumExists = true;  // If the document with the same ID exists, set flag to true
        }
    });

    return curriculumExists;
}

// Function to confirm and save curriculum to Firestore
// Modified confirmAndSaveCurriculum function with error handling
async function confirmAndSaveCurriculum() {
    const curriculumData = gatherTableData();

    // Get the selected program and curriculum year from the form
    const program = document.getElementById('programSelect').value;
    const curriculumYear = document.getElementById('curriculumYear').value;

    if (!program) {
        alert("Please select a program before confirming.");
        return;
    }

    // Check if any of the Set Hours is 0
    const zeroHourSubjects = curriculumData.filter(row => row['Set Hours'] == 0);
    if (zeroHourSubjects.length > 0) {
        // Get the sethours dialog element
        const setHoursDialog = document.getElementById("sethours");
        const setHoursButton = setHoursDialog.querySelector(".ok-btn");
    
        // Show the dialog
        setHoursDialog.showModal();
    
        // Add event listener to the OK button to close the dialog
        setHoursButton.addEventListener("click", () => {
            setHoursDialog.close();
        }, { once: true });
    
        return; // Exit the function after showing the dialog
    }

    // Check if the curriculum already exists in Firestore
    const curriculumExists = await checkIfCurriculumExists(program, curriculumYear);
    
    if (curriculumExists) {
        alert(`Error: The curriculum for ${program} Batch ${curriculumYear} already exists!`);
        return;
    }

    // Confirmation dialog
    if (confirm("Are you sure you want to save this curriculum?")) {
        const newDocId = `${program.replace(/\s+/g, '')}Curriculum${curriculumYear}`;
        try {
            const programCollectionRef = collection(db, "mainCurriculum", "mainCurriculum_COED", program);
            const curriculumDocRef = doc(programCollectionRef, newDocId);
            await setDoc(curriculumDocRef, { csvRows: curriculumData });

            alert(`Curriculum confirmed and saved successfully as ${newDocId} in ${program}!`);

            // Clear fields in tempCurriculum_COED (temporary storage)
            const tempDocRef = doc(db, "tempCurriculum", "tempCurriculum_COED");
            await updateDoc(tempDocRef, { csvRows: [] });
            clearTable();
            uploadCSVToS3();
            fetchTempCurriculumData();
        } catch (error) {
            alert("Error saving curriculum.");
            console.error("Error saving curriculum data to Firestore:", error);
        }
    }
}

// Function to get the next document ID
async function getNextDocumentId() {
    const mainCurriculumRef = collection(db, "mainCurriculum",);
    const snapshot = await getDocs(mainCurriculumRef);
    let maxId = 0;

    // Iterate through the documents to find the highest ID
    snapshot.forEach(doc => {
        const id = doc.id.replace("mainCurriculum_COED", ""); // Remove the prefix to get the number
        const numId = parseInt(id, 10);
        if (!isNaN(numId) && numId > maxId) {
            maxId = numId; // Update maxId if the current id is greater
        }
    });

    // Create a new document ID based on the maxId
    const nextId = `mainCurriculum_COED${maxId + 1}`;
    console.log("Next document ID will be:", nextId); // Debug
    return nextId;
}

function clearTable() {
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');

    if (tableHead && tableBody) {
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';
        console.log("Table cleared.");
    } else {
        console.warn("Table elements not found.");
    }
}

document.getElementById('uploadForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const fileInput = document.getElementById('fileUpload');
    const file = fileInput.files[0];

    const selectedProgram = document.getElementById('programSelect').value;
    const selectedYear = document.getElementById('curriculumYear').value;

    if (!selectedProgram || !selectedYear) {
        alert("Please select a program and enter a curriculum year.");
        return;
    }

    if (file) {
        const reader = new FileReader();

        reader.onload = function (event) {
            const csvData = event.target.result;
            const parsedData = parseCSV(csvData);
            
            // Validate the uploaded file's program and batch/year
            if (validateCSVData(parsedData, selectedProgram, selectedYear)) {
                // If valid, display the data
                transformAndDisplayTempCurriculumData(parsedData);
                // Upload Dialog
            const uploadDialog = document.getElementById("upload"); // Success message after displaying the data
                // Show the Upload Dialog
            uploadDialog.showModal(); // Display success message for uploading the data
                // Add an event listener for the "OK" button in the Upload Dialog
            const uploadOkButton = uploadDialog.querySelector(".ok-btn");
            uploadOkButton.addEventListener("click", () => {
            uploadDialog.close(); // Close the Upload Dialog when "OK" is clicked
    });

            }
        };

        reader.readAsText(file);
    } else {
        alert("No file selected!");
    }
});

// Function to delete data from tempCurriculum_COED and clear the table
async function deleteCurriculum() {
    // Confirmation dialog
    if (!confirm("Are you sure you want to delete the displayed curriculum data? This action cannot be undone.")) {
        return; // If user cancels, stop the function
    }

    // Clear data from Firestore (tempCurriculum_COED)
    const tempDocRef = doc(db, "tempCurriculum", "tempCurriculum_COED");

    try {
        await updateDoc(tempDocRef, { csvRows: [] }); // Clear the document in Firestore
        alert("Curriculum data deleted successfully.");

        // Clear the displayed table on the frontend
        clearTable();
    } catch (error) {
        alert("Error deleting curriculum data.");
        console.error("Error deleting curriculum data from Firestore:", error);
    }
}

// Add event listener for the "Delete" button
document.getElementById('deleteCurriculumBtn').addEventListener('click', deleteCurriculum);

// Add event listener to the "Confirm Curriculum" button
document.getElementById('confirmCurriculumBtn').addEventListener('click', confirmAndSaveCurriculum);

// **New Code: Add event listener to the "View Curriculum" button**
document.getElementById('viewCurriculumBtn').addEventListener('click', function() {
    window.location.href = 'COED_VIEW_CURRICULUM.html';
});

// Fetch and display data on page load
window.onload = function() {
    console.log("Page loaded. Fetching initial curriculum data..."); // Debug
    
    createTableHeaders();
    fetchTempCurriculumData();
}
