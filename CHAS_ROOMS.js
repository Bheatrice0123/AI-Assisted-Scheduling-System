import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.1.2/firebase-app.js';
import { getFirestore, collection, doc, query, orderBy, limit, getDocs, setDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.1.2/firebase-firestore.js';

// Initialize Firebase (add your configuration)
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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', async function() {
    const form = document.getElementById('courseSectionForm');
    const tableBody = document.querySelector('#courseTable tbody');

    // Fetch and display existing rooms from Firestore when the page loads
    await getRoomsFromFirestore();

    document.getElementById('cancelEdit').addEventListener('click', function() {
        document.getElementById('editFormContainer').style.display = 'none';
        document.getElementById('overlay').style.display = 'none';
    });

    document.getElementById('confirmEdit').addEventListener('click', async function() {
        const docId = document.getElementById('editRoomId').value;
        const campus = document.getElementById('editCampus').value;
        const roomType = document.getElementById('editRoomType').value;
        const roomNumber = document.getElementById('editRoomNumber').value;
    
        if (!docId) {
            alert("Error: No document ID found for updating.");
            return;
        }

        // Check for duplicates excluding the current document
        const duplicateExists = await doesRoomExist(roomNumber, campus, roomType, docId);
        if (duplicateExists) {
            alert("A room with this number, type, and campus already exists.");
            return; // Exit if a duplicate room is found
        }

    
        try {
            // Reference to the Room_CHAS document in the Firestore
            const roomDocRef = doc(db, 'Room_Data', 'Room_CHAS', 'rooms', docId);
    
            // Update Firestore document with new data
            await setDoc(roomDocRef, {
                campus: campus,
                roomType: roomType,
                roomNumber: roomNumber
            }, { merge: true });
    
            alert('Room details updated successfully.');

            // Optionally refresh the table or update the row directly here
            document.getElementById('editFormContainer').style.display = 'none';
            document.getElementById('overlay').style.display = 'none';

            // Clear the table and reload data
            const tableBody = document.querySelector('#courseTable tbody');
            tableBody.innerHTML = ''; // Clear existing rows
            await getRoomsFromFirestore(); // Re-fetch and display updated data
        
        } catch (error) {
            console.error("Error updating room:", error);
            alert("Failed to update room details.");
        }
    });

    form.addEventListener('submit', async function(event) {
        event.preventDefault(); // Prevent the form from submitting normally

        // Get form values
        const campus = document.getElementById('campus').value;
        const roomType = document.getElementById('roomType').value;
        const roomNumber = document.getElementById('roomNumber').value;

        // Validate that the room number is not empty
        if (!roomNumber.trim()) {
            alert('Please enter a room number.');
            return; // Exit the function if room number is empty
        }

        // Check if the room already exists
        const roomExists = await doesRoomExist(roomNumber, campus, roomType, null);
        if (roomExists) {
            alert('A room with this number, type, and campus already exists.');
            form.reset();
            return; // Exit if the room already exists
        }

        // Confirm the action before adding the room
        const confirmAdd = confirm('Do you want to add this room?');
        if (!confirmAdd) {
            return; // Exit if the user doesn't confirm
        }

        // Create and append new row
        appendRoomToTable(campus, roomType, roomNumber);

        // Clear form fields
        form.reset();

        // Save to Firestore
        await saveRoomToFirestore(campus, roomType, roomNumber);
    });

    async function doesRoomExist(roomNumber, campus, roomType, excludeDocId = null) {
        try {
            const roomDocRef = doc(db, 'Room_Data', 'Room_CHAS');
            const roomCollectionRef = collection(roomDocRef, 'rooms');
            const roomsSnapshot = await getDocs(roomCollectionRef);
    
            for (const roomDoc of roomsSnapshot.docs) {
                const roomData = roomDoc.data();
    
                // Check if the room data matches and is not the current document being edited
                if (
                    roomData.roomNumber === roomNumber &&
                    roomData.campus === campus &&
                    roomData.roomType === roomType &&
                    roomDoc.id !== excludeDocId
                ) {
                    return true; // Duplicate room found
                }
            }
            return false; // No duplicate found
        } catch (error) {
            console.error("Error checking room existence: ", error);
            return false;
        }
    }
    

    async function saveRoomToFirestore(campus, roomType, roomNumber) {
        try {
            // Reference to the Room_CHAS document
            const roomDocRef = doc(db, 'Room_Data', 'Room_CHAS');
    
            // Reference to the sub-collection 'rooms' under Room_CHAS document
            const roomCollectionRef = collection(roomDocRef, 'rooms');
    
            // Get the last document in the sub-collection to determine the next ID
            const lastDocQuery = query(roomCollectionRef, orderBy('id', 'desc'), limit(1));
            const lastDoc = await getDocs(lastDocQuery);
    
            let newId = 1; // Default to 1 if no documents are found
            if (!lastDoc.empty) {
                const lastDocData = lastDoc.docs[0].data();
                const lastId = parseInt(lastDocData.id.replace('roomCHAS_', '')); // Extract the numeric part of the ID
                newId = lastId + 1; // Increment to get the new ID
            }
    
            // New document ID with leading zeros (e.g., sectionCHAS_001)
            const newDocId = `roomCHAS_${newId.toString().padStart(3, '0')}`;
    
            // Save the new room data with the incrementing ID in the sub-collection
            await setDoc(doc(roomCollectionRef, newDocId), {
                id: newDocId,
                campus: campus,
                roomType: roomType,
                roomNumber: String(roomNumber) // Ensure roomNumber is a string
            });
    
            console.log(`Room saved with ID: ${newDocId}`);
        } catch (error) {
            console.error("Error saving room to Firestore: ", error);
        }
    }

    async function getRoomsFromFirestore() {
        try {
            // Reference to the Room_CHAS document
            const roomDocRef = doc(db, 'Room_Data', 'Room_CHAS');
    
            // Reference to the sub-collection 'rooms' under Room_CHAS document
            const roomCollectionRef = collection(roomDocRef, 'rooms');
    
            // Get all rooms in the sub-collection
            const roomsSnapshot = await getDocs(roomCollectionRef);
    
            roomsSnapshot.forEach(doc => {
                const roomData = doc.data();
                appendRoomToTable(roomData.campus, roomData.roomType, roomData.roomNumber, doc.id);
            });
        } catch (error) {
            console.error("Error fetching rooms from Firestore: ", error);
        }
    }

    async function deleteRoomFromFirestore(roomNumber) {
        try {
            // Reference to the Room_CHAS document
            const roomDocRef = doc(db, 'Room_Data', 'Room_CHAS');
        
            // Reference to the sub-collection 'rooms' under Room_CHAS document
            const roomCollectionRef = collection(roomDocRef, 'rooms');
        
            // Get all rooms in the sub-collection
            const roomsSnapshot = await getDocs(roomCollectionRef);
        
            // Loop through each document to find the one matching the room number
            for (const roomDoc of roomsSnapshot.docs) {
                const roomData = roomDoc.data();
        
                // If the room number matches, delete the document
                if (roomData.roomNumber === roomNumber) {
                    await deleteDoc(doc(roomCollectionRef, roomDoc.id));
                    console.log(`Room with number ${roomNumber} deleted from Firestore.`);
                    return true;
                }
            }
            console.error(`Room with number ${roomNumber} not found in Firestore.`);
            return false;
        } catch (error) {
            console.error("Error deleting room from Firestore: ", error);
            return false;
        }
    }

    function appendRoomToTable(campus, roomType, roomNumber, docId) {
        // Create a new row
        const newRow = document.createElement('tr');

        // Create cells
        const campusCell = document.createElement('td');
        campusCell.textContent = campus;

        const roomTypeCell = document.createElement('td');
        roomTypeCell.textContent = roomType;

        const roomNumberCell = document.createElement('td');
        roomNumberCell.textContent = roomNumber;

        const optionsCell = document.createElement('td');
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';

        // Set up the Edit button event listener
        editButton.addEventListener('click', function() {
            document.getElementById('editFormContainer').style.display = 'block'; // Show the form
            document.getElementById('overlay').style.display = 'block'; // Show the overlay if you have one

            // Populate the form with the current row data
            document.getElementById('editCampus').value = campus;
            document.getElementById('editRoomType').value = roomType;
            document.getElementById('editRoomNumber').value = roomNumber;
            document.getElementById('editRoomId').value = docId; // Store the document ID
        });


        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = async function() {

            const confirmDelete = confirm('Are you sure you want to delete this room?');
            if (!confirmDelete) {
                return; // Exit if the user doesn't confirm the deletion
            }

            // Delete room from Firestore
            const deleted = await deleteRoomFromFirestore(roomNumber);
            if (deleted) {
                // Remove the row from the table only if deletion is successful
                tableBody.removeChild(newRow);

                // Show a success message after deletion
                alert('Room deleted successfully.');
            }
        };

        optionsCell.appendChild(editButton);
        optionsCell.appendChild(deleteButton);

        // Append cells to the new row
        newRow.appendChild(campusCell);
        newRow.appendChild(roomTypeCell);
        newRow.appendChild(roomNumberCell);
        newRow.appendChild(optionsCell);

        // Append the new row to the table
        const tableBody = document.querySelector('#courseTable tbody');
        tableBody.appendChild(newRow);

    }
});