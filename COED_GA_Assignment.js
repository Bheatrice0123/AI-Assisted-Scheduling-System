import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, deleteField } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Shuffle array utility
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Fetch COED Faculty
async function fetchCOEDFaculty() {
    const coedFacultyData = [];
    const facultyCollection = collection(db, 'Faculty_Data', 'COED', 'COED_Faculty');
    const querySnapshot = await getDocs(facultyCollection);

    querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        coedFacultyData.push(data);
    });

    return coedFacultyData;
}

// Fetch Sections
async function fetchSections() {
    const sectionData = [];
    const sectionCollection = collection(db, 'Section_Data', 'Section_COED', 'Sections');
    const querySnapshot = await getDocs(sectionCollection);

    querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        sectionData.push(data);
    });

    return sectionData;
}

async function fetchCourses(selectedSemester, academicYear) {
    const courseData = [];
    const startYear = parseInt(academicYear.split('-')[0], 10);

    // Define the main curriculum path
    const curriculumPrograms = ['BEED', 'BSED-E', 'BSED-F', 'BSED-M', "BSED-S"]; // Add other programs if needed

    // Loop through each program in mainCurriculum_COED
    for (const program of curriculumPrograms) {
        const programCollection = collection(db, 'mainCurriculum', 'mainCurriculum_COED', program);
        const querySnapshot = await getDocs(programCollection);

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();

            if (!data.csvRows || !Array.isArray(data.csvRows)) {
                console.error(`Document ${docSnap.id} in program ${program} does not have a valid csvRows field.`);
                return; // Skip this document
            }

            const csvRows = data.csvRows;

            csvRows.forEach((course) => {
                // Ensure each course has required properties
                if (!course["Year Level"] || !course.Batch || !course.Semester) {
                    console.error(`Invalid course data in document ${docSnap.id} in program ${program}:`, course);
                    return; // Skip invalid course
                }

                // Apply curriculum rules based on the academic year
                if (startYear === 2024) {
                    // For Academic Year 2024-2025: 1st & 2nd Year -> Batch 2023, 3rd & 4th Year -> Batch 2018
                    if ((course["Year Level"] === "1st Year" || course["Year Level"] === "2nd Year") && course.Batch === "2023" && course.Semester === selectedSemester) {
                        courseData.push(course);
                    } else if ((course["Year Level"] === "3rd Year" || course["Year Level"] === "4th Year") && course.Batch === "2018" && course.Semester === selectedSemester) {
                        courseData.push(course);
                    }
                } else if (startYear === 2025) {
                    // For Academic Year 2025-2026: 1st to 3rd Year -> Batch 2023, 4th Year -> Batch 2018
                    if ((course["Year Level"] === "1st Year" || course["Year Level"] === "2nd Year" || course["Year Level"] === "3rd Year") && course.Batch === "2023" && course.Semester === selectedSemester) {
                        courseData.push(course);
                    } else if (course["Year Level"] === "4th Year" && course.Batch === "2018" && course.Semester === selectedSemester) {
                        courseData.push(course);
                    }
                } else if (startYear >= 2026) {
                    // For Academic Year 2026-2027 and beyond: All year levels -> Batch 2023
                    if (course.Batch === "2023" && course.Semester === selectedSemester) {
                        courseData.push(course);
                    }
                }
            });
        });
    }

    if (courseData.length === 0) {
        console.error(`No courses found for Semester: ${selectedSemester} in Academic Year: ${academicYear}`);
    }

    console.log("Final courseData structure before return:", courseData);
    return courseData;
}



function initializePopulation(coedFacultyData, courseData, sectionData, populationSize) {
    const population = [];
    let noFacultyAlertShown = false;
    const unassignedCourses = [];  // Tracks unassigned courses for alerting

    for (let i = 0; i < populationSize; i++) {
        const chromosome = [];
        const facultyHours = {};
        const facultyAssignments = {};  // Tracks section assignments per faculty

        // Initialize faculty hours and assignment tracking for COED Faculty only
        coedFacultyData.forEach(faculty => {
            facultyHours[faculty.name] = 0;
            facultyAssignments[faculty.name] = {};
        });

        sectionData.forEach(section => {
            courseData.forEach(course => {
                if (!course || !section || course["Year Level"] !== section.year_level) return;

                // Step 1: Attempt to assign experienced faculty
                let experiencedFaculty = [];
                if (course.GenEd === "TRUE") {
                    experiencedFaculty = coedFacultyData.filter(faculty =>
                        faculty.isActive &&
                        faculty.genEd === true &&
                        faculty.past_courses &&
                        faculty.past_courses.some(c => c.course_code === course["Course Code"]) &&
                        (facultyHours[faculty.name] + parseFloat(course["Set Hours"]) <= faculty.max_hours)
                    );
                } else {
                    experiencedFaculty = coedFacultyData.filter(faculty =>
                        faculty.isActive &&
                        faculty.past_courses &&
                        faculty.past_courses.some(c => c.course_code === course["Course Code"]) &&
                        (facultyHours[faculty.name] + parseFloat(course["Set Hours"]) <= faculty.max_hours)
                    );
                }

                let assigned = false;
                for (const faculty of experiencedFaculty) {
                    if (!facultyAssignments[faculty.name][section.section_name]) {
                        facultyAssignments[faculty.name][section.section_name] = { assignedCourse: null };
                    }

                    const sectionAssignment = facultyAssignments[faculty.name][section.section_name];

                    if (!sectionAssignment.assignedCourse || sectionAssignment.assignedCourse === course["Course Code"]) {
                        sectionAssignment.assignedCourse = course["Course Code"];
                        chromosome.push({
                            course_code: course["Course Code"],
                            course_title: course["Course Title"],
                            faculty_name: faculty.name,
                            section_name: section.section_name,
                            year_level: section.year_level,
                            type: course.Type,
                            program: course.Program,
                            semester: course.Semester,
                            set_hours: course["Set Hours"],
                            genEd: course.GenEd
                        });

                        facultyHours[faculty.name] += parseFloat(course["Set Hours"]);
                        assigned = true;
                        break;
                    }
                }

                // Step 2: If no experienced faculty were assigned, assign any eligible faculty
                if (!assigned) {
                    let eligibleFaculty = coedFacultyData.filter(faculty =>
                        faculty.isActive &&
                        (course.GenEd === "TRUE" ? faculty.genEd === true : true) &&
                        (facultyHours[faculty.name] + parseFloat(course["Set Hours"]) <= faculty.max_hours)
                    );

                    eligibleFaculty.sort((a, b) => {
                        const pastCoursesA = Array.isArray(a.past_courses)
                            ? a.past_courses.filter(c => c.course_code === course["Course Code"]).length
                            : 0;
                        const pastCoursesB = Array.isArray(b.past_courses)
                            ? b.past_courses.filter(c => c.course_code === course["Course Code"]).length
                            : 0;
                        return pastCoursesB - pastCoursesA;
                    });

                    for (const faculty of eligibleFaculty) {
                        if (!facultyAssignments[faculty.name][section.section_name]) {
                            facultyAssignments[faculty.name][section.section_name] = { assignedCourse: null };
                        }

                        const sectionAssignment = facultyAssignments[faculty.name][section.section_name];

                        if (!sectionAssignment.assignedCourse || sectionAssignment.assignedCourse === course["Course Code"]) {
                            sectionAssignment.assignedCourse = course["Course Code"];
                            chromosome.push({
                                course_code: course["Course Code"],
                                course_title: course["Course Title"],
                                faculty_name: faculty.name,
                                section_name: section.section_name,
                                year_level: section.year_level,
                                type: course.Type,
                                program: course.Program,
                                semester: course.Semester,
                                set_hours: course["Set Hours"],
                                genEd: course.GenEd
                            });

                            facultyHours[faculty.name] += parseFloat(course["Set Hours"]);
                            assigned = true;
                            break;
                        }
                    }

                    // Log unassigned courses if no eligible faculty are found
                    if (!assigned && !noFacultyAlertShown) {
                        console.error(`No available faculty could be assigned to course ${course["Course Code"]} in section ${section.section_name}`);
                        alert("No available faculty for some courses. Consider hiring more faculty.");
                        noFacultyAlertShown = true;
                        unassignedCourses.push({
                            course_code: course["Course Code"],
                            course_title: course["Course Title"],
                            section_name: section.section_name
                        });
                    }
                }
            });
        });
        population.push(chromosome);
    }

    // Notify about unassigned courses if any
    if (unassignedCourses.length > 0) {
        let unassignedList = "Unassigned Courses:\n";
        unassignedCourses.forEach(course => {
            unassignedList += `${course.course_code} - ${course.course_title} (${course.section_name})\n`;
        });
        alert(unassignedList);
    } else {
        console.log("All courses successfully assigned.");
    }
    return population;
}

// Fitness Function
function fitnessFunction(chromosome, coedFacultyData, courseData) {
    let score = 0;
    const facultyHours = {};

    coedFacultyData.forEach(faculty => {
        facultyHours[faculty.name] = 0;
    });

    chromosome.forEach(assignment => {
        const course = courseData.find(c => c.course_code === assignment.course_code);
        const faculty = coedFacultyData.find(f => f.name === assignment.faculty_name);

        if (course && faculty) {
            // Reward based on past experience with this course
            const matchingPastCourses = faculty.past_courses.filter(c =>
                c.course_code === course.course_code || 
                c.program === course.program || 
                c.type === course.type
            );
            score += matchingPastCourses.length * 100;

            // Additional reward for GenEd courses if faculty is qualified for GenEd
            if (course.GenEd === "TRUE" && faculty.genEd === true) {
                score += 100;
            }

            // Reward if faculty is active
            if (faculty.isActive) {
                score += 25;
            }

            // Track faculty hours and penalize if hours exceed their maximum
            facultyHours[faculty.name] += parseFloat(course["Set Hours"]);
            if (facultyHours[faculty.name] > faculty.max_hours) {
                score -= 100;
            }
        }
    });

    return score > 0 ? score : 1;  // Ensure a positive score
}

function selection(population, fitnessScores, tournamentSize = 3) {
    const selectedParents = [];

    for (let i = 0; i < 2; i++) {
        const tournament = [];
        for (let j = 0; j < tournamentSize; j++) {
            const randomIndex = Math.floor(Math.random() * population.length);
            tournament.push({ chromosome: population[randomIndex], fitness: fitnessScores[randomIndex] });
        }

        tournament.sort((a, b) => b.fitness - a.fitness);
        selectedParents.push(tournament[0].chromosome);
    }

    return selectedParents;
}

function crossover(parent1, parent2) {
    const crossoverPoint = Math.floor(Math.random() * parent1.length);
    const child1 = parent1.slice(0, crossoverPoint).concat(parent2.slice(crossoverPoint));
    const child2 = parent2.slice(0, crossoverPoint).concat(parent1.slice(crossoverPoint));
    return [child1, child2];
}

function mutation(chromosome, coedFacultyData, courseData, mutationRate = 0.05) {
    const facultyHours = {};

    // Initialize faculty hours based on current chromosome
    coedFacultyData.forEach(faculty => {
        facultyHours[faculty.name] = 0;
    });
    chromosome.forEach(assignment => {
        facultyHours[assignment.faculty_name] += parseFloat(assignment.set_hours);
    });

    // Apply mutation
    for (let i = 0; i < chromosome.length; i++) {
        if (Math.random() < mutationRate) {
            const course = courseData.find(c => c.course_code === chromosome[i].course_code);
            if (!course) continue;

            // Find eligible faculty based on GenEd qualification and hour limits
            let eligibleFaculty;
            if (course.GenEd === "TRUE") {
                eligibleFaculty = coedFacultyData.filter(faculty =>
                    faculty.isActive && faculty.genEd === true &&
                    (faculty.max_hours >= facultyHours[faculty.name] + parseFloat(course.set_hours))
                );
            } else {
                eligibleFaculty = coedFacultyData.filter(faculty =>
                    faculty.isActive &&
                    (faculty.max_hours >= facultyHours[faculty.name] + parseFloat(course.set_hours))
                );
            }

            if (eligibleFaculty.length === 0) continue;  // Skip if no eligible faculty are found

            // Select a new faculty randomly from eligible candidates
            const newFaculty = eligibleFaculty[Math.floor(Math.random() * eligibleFaculty.length)];
            facultyHours[chromosome[i].faculty_name] -= parseFloat(course.set_hours);
            chromosome[i].faculty_name = newFaculty.name;
            facultyHours[newFaculty.name] += parseFloat(course.set_hours);
        }
    }

    return chromosome;
}



export async function geneticAlgorithm(coedFacultyData, courseData, sectionData, populationSize = 50, generations = 100, mutationRate = 0.05) {
    // Initialize population with COED Faculty
    let population = initializePopulation(coedFacultyData, courseData, sectionData, populationSize);
    
    for (let gen = 0; gen < generations; gen++) {
        // Evaluate fitness for each chromosome in the population
        const fitnessScores = population.map(chromosome => fitnessFunction(chromosome, coedFacultyData, courseData));

        // Select the best chromosome
        const bestFitness = Math.max(...fitnessScores);
        const bestChromosome = population[fitnessScores.indexOf(bestFitness)];

        if ((gen + 1) % 10 === 0 || gen === 0) {
            console.log(`Generation ${gen + 1}: Best Fitness = ${bestFitness}`);
        }

        // Create new population through selection, crossover, and mutation
        const newPopulation = [];
        newPopulation.push(bestChromosome);  // Elitism: carry the best chromosome to the next generation

        while (newPopulation.length < populationSize) {
            // Selection
            const [parent1, parent2] = selection(population, fitnessScores);

            // Crossover
            const [child1, child2] = crossover(parent1, parent2);

            // Mutation
            const mutatedChild1 = mutation(child1, coedFacultyData, courseData, mutationRate);
            const mutatedChild2 = mutation(child2, coedFacultyData, courseData, mutationRate);

            newPopulation.push(mutatedChild1, mutatedChild2);
        }

        population = newPopulation.slice(0, populationSize);
    }

    // Final evaluation to get the best chromosome of the last generation
    const finalFitnessScores = population.map(chromosome => fitnessFunction(chromosome, coedFacultyData, courseData));
    const bestFinalFitness = Math.max(...finalFitnessScores);
    const bestFinalChromosome = population[finalFitnessScores.indexOf(bestFinalFitness)];

    return { bestChromosome: bestFinalChromosome, bestFitness: bestFinalFitness };
}


async function saveBestAssignment(bestChromosomeWithRooms, fitness, academicYear, selectedSemester) {
    const timestamp = new Date().toISOString();
    const assignmentDocRef = doc(db, 'GenerateSchedule', 'COED_Schedule');

    // Verify that bestChromosomeWithRooms is an array
    if (!Array.isArray(bestChromosomeWithRooms)) {
        console.error("Error: bestChromosomeWithRooms is not an array.");
        return;
    }

    const assignmentData = {
        fitness: fitness,
        assignments: bestChromosomeWithRooms,
        timestamp: timestamp,
        academicYear: academicYear,  // Store academic year
        selectedSemester: selectedSemester  // Store selected semester
    };

    try {
        console.log('Saving Best Assignment to Firestore:', JSON.stringify(assignmentData, null, 2));
        await setDoc(assignmentDocRef, assignmentData);
        console.log('Best assignment saved to Firestore.');
    } catch (error) {
        console.error('Error saving assignment to Firestore:', error);
    }
}

async function fetchRooms() {
    const roomData = [];
    const roomCollection = collection(db, 'Room_Data', 'Room_COED', 'rooms');
    const querySnapshot = await getDocs(roomCollection);

    querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        roomData.push({
            room_name: data.roomNumber,
            type: data.roomType
        });
    });

    return roomData;
}

function assignRooms(bestChromosome, roomData) {
    // Define courses that require "GYM" rooms
    const gymRequiredCourses = ["PED101", "PED102", "PED103", "PED104", "PHD101", "PHD102", "NSTP1", "NSTP2"];

    bestChromosome.forEach(assignment => {
        let suitableRooms;

        // Only allow specific courses to use "GYM" rooms
        if (gymRequiredCourses.includes(assignment.course_code)) {
            // Filter rooms that contain "GYM" in their roomNumber for these specific courses
            suitableRooms = roomData.filter(room => room.room_name.includes("GYM"));
        } else {
            // Exclude "GYM" rooms from general room assignments
            suitableRooms = roomData.filter(room => room.type === assignment.type && !room.room_name.includes("GYM"));
        }

        // Check if there are suitable rooms available
        if (suitableRooms.length > 0) {
            const assignedRoom = suitableRooms[Math.floor(Math.random() * suitableRooms.length)];
            assignment.room_name = assignedRoom.room_name;
            console.log(`Assigned room ${assignedRoom.room_name} to course ${assignment.course_code}`);
        } else {
            console.log(`No suitable room found for Course: ${assignment.course_code}, Type: ${assignment.type}`);
        }
    });

    return bestChromosome;
}

// Utility to parse time strings into comparable numbers (e.g., "8:00 AM" -> 8.00)
function parseTime(timeString) {
    if (!timeString || typeof timeString !== 'string') {
        console.error(`Invalid time string: ${timeString}`);
        return NaN; // Return NaN if the time string is invalid
    }

    const [time, modifier] = timeString.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0; // Handle 12 AM edge case

    return hours + (minutes / 60);
}

async function fetchAllDepartmentSchedules(academicYear, semester) {
    const departments = ['CBAA', 'CAS', 'COE', 'CHAS', 'CCS'];  // Add any other departments
    const schedules = [];

    const academicYearDocId = `A.Y. ${academicYear}`;

    for (const department of departments) {
        const scheduleRef = collection(db, 'finalSchedule', academicYearDocId, semester, department, 'schedule');
        const querySnapshot = await getDocs(scheduleRef);

        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            schedules.push(data);
        });
    }

    return schedules;
}

async function assignDayAndTimeWithExternalCheck(bestChromosomeWithRooms, academicYear, semester) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const startTime = 7;
    const endTime = 21;
    const maxSubjectsPerDay = 3;

    let noTimeSlotAlertShown = false; // Alert flag for no available time slot

    // Fetch existing schedules from other departments
    const externalSchedules = await fetchAllDepartmentSchedules(academicYear, semester);

    // Track schedules for faculty, sections, and rooms to prevent conflicts
    const facultySchedule = {};
    const sectionSchedule = {};
    const roomSchedule = {};

    // Load existing schedules into our tracking objects to check for conflicts
    externalSchedules.forEach(external => {
        const day = external.day;
        const timeSlot = { 
            time_start: external.time_start, 
            time_end: external.time_end, 
            section: external.section_name, 
            faculty: external.faculty_name, 
            room: external.room_name 
        };

        // Load into schedules to check conflicts
        if (!facultySchedule[timeSlot.faculty]) facultySchedule[timeSlot.faculty] = {};
        if (!sectionSchedule[timeSlot.section]) sectionSchedule[timeSlot.section] = {};
        if (!roomSchedule[timeSlot.room]) roomSchedule[timeSlot.room] = {};

        if (!facultySchedule[timeSlot.faculty][day]) facultySchedule[timeSlot.faculty][day] = [];
        if (!sectionSchedule[timeSlot.section][day]) sectionSchedule[timeSlot.section][day] = [];
        if (!roomSchedule[timeSlot.room][day]) roomSchedule[timeSlot.room][day] = [];

        facultySchedule[timeSlot.faculty][day].push(timeSlot);
        sectionSchedule[timeSlot.section][day].push(timeSlot);
        roomSchedule[timeSlot.room][day].push(timeSlot);
    });

    // Assign day and time while checking for conflicts
    bestChromosomeWithRooms.forEach(assignment => {

        // Skip NSTP1 and NSTP2 as they have both fixed day and time
        if ((assignment.course_code === "NSTP1" || assignment.course_code === "NSTP2") && assignment.day === "Saturday") {
            console.log(`Skipping ${assignment.course_code}, fixed on Saturday, 8AM - 11AM`);
            return;
        }

        const duration = parseFloat(assignment.set_hours);
        const facultyName = assignment.faculty_name;
        const sectionName = assignment.section_name;
        const roomName = assignment.room_name;
        const fixedDay = assignment.day;

        // Initialize schedules if they don't exist
        if (!facultySchedule[facultyName]) facultySchedule[facultyName] = {};
        if (!sectionSchedule[sectionName]) sectionSchedule[sectionName] = {};
        if (!roomSchedule[roomName]) roomSchedule[roomName] = {};

        let dayAssigned = false;

        // Assign subjects across days with a maximum of two subjects per day per section
        for (const day of days) {

            if (fixedDay && day !== fixedDay) continue;

            if (!facultySchedule[facultyName][day]) facultySchedule[facultyName][day] = [];
            if (!sectionSchedule[sectionName][day]) sectionSchedule[sectionName][day] = [];
            if (!roomSchedule[roomName][day]) roomSchedule[roomName][day] = [];

            // Ensure section has no more than two subjects on this day
            if (sectionSchedule[sectionName][day].length >= maxSubjectsPerDay) continue;

            // Check for available time slots without conflicts
            const availableStartTimes = [];
            for (let time = startTime; time <= endTime - duration; time++) {
                const hasConflict = facultySchedule[facultyName][day].some(slot => 
                    isTimeConflict(slot, time, duration)) ||
                    sectionSchedule[sectionName][day].some(slot => 
                    isTimeConflict(slot, time, duration)) ||
                    roomSchedule[roomName][day].some(slot => 
                    isTimeConflict(slot, time, duration));

                if (!hasConflict) {
                    availableStartTimes.push(time);
                }
            }

            // Assign the first available time slot
            if (availableStartTimes.length > 0) {
                const startHour = availableStartTimes[0];
                const endHour = startHour + duration;

                const formatTime = (hour) => {
                    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
                    const period = hour >= 12 ? 'PM' : 'AM';
                    return `${formattedHour}:00 ${period}`;
                };

                assignment.day = day;
                assignment.time_start = formatTime(startHour);
                assignment.time_end = formatTime(endHour);

                // Record the assignment in faculty, section, and room schedules
                facultySchedule[facultyName][day].push({
                    time_start: assignment.time_start,
                    time_end: assignment.time_end,
                    section: sectionName,
                    course: assignment.course_title,
                    room: roomName
                });
                sectionSchedule[sectionName][day].push({
                    time_start: assignment.time_start,
                    time_end: assignment.time_end,
                    faculty: facultyName,
                    course: assignment.course_title,
                    room: roomName
                });
                roomSchedule[roomName][day].push({
                    time_start: assignment.time_start,
                    time_end: assignment.time_end,
                    faculty: facultyName,
                    section: sectionName,
                    course: assignment.course_title
                });

                dayAssigned = true;
                break; // Stop after assigning a valid day and time
            }
        }

        if (!dayAssigned && !noTimeSlotAlertShown) {
            console.error(`No available time slot for course ${assignment.course_code} in section ${sectionName}`);
            alert("No available time slot for some courses. Consider adding more rooms.");
            noTimeSlotAlertShown = true;
        }
    });

    console.log("Final section schedule with cross-department conflict checks:", sectionSchedule);
    return bestChromosomeWithRooms;
}

// Function to assign specific days and times for fixed courses
function assignFixedDayAndTime(chromosome) {
    chromosome.forEach(assignment => {
        // Assign NSTP1 and NSTP2 to Saturday, 8AM to 11AM
        if (assignment.course_code === "NSTP1" || assignment.course_code === "NSTP2") {
            assignment.day = "Saturday";
            assignment.time_start = null;
            assignment.time_end = null;
            console.log(`Assigned ${assignment.course_code} to Saturday, 8AM - 11AM`);
        }
        
        // Assign PHD101 and PHD102 to Sunday only (time will be assigned later)
        else if (assignment.course_code === "PHD101" || assignment.course_code === "PHD102") {
            assignment.day = "Sunday";
            assignment.time_start = null; // Leave time undefined for later assignment
            assignment.time_end = null;
            console.log(`Assigned ${assignment.course_code} to Sunday without fixed time`);
        }
    });

    return chromosome;
}

// Helper function to detect time conflicts
function isTimeConflict(slot, startTime, duration) {
    const slotStart = parseTime(slot.time_start);
    const slotEnd = parseTime(slot.time_end);
    const courseStart = startTime;
    const courseEnd = startTime + duration;
    return (courseStart < slotEnd && courseEnd > slotStart);
}

export async function saveAndClearSchedule() {
    const sourceDocRef = doc(db, "GenerateSchedule", "COED_Schedule");

    try {
        // Fetch the current schedule
        const scheduleDoc = await getDoc(sourceDocRef);

        if (scheduleDoc.exists()) {
            const scheduleData = scheduleDoc.data();
            const { academicYear, selectedSemester } = scheduleData;

            // Validate academicYear and selectedSemester
            if (!academicYear || !selectedSemester) {
                console.error("Missing academicYear or selectedSemester in COED_Schedule document.");
                return;
            }

            // Create dynamic path based on academic year and semester
            const targetCollectionPath = collection(
                db,
                "finalSchedule",
                `A.Y. ${academicYear}`,
                selectedSemester,
                "COED",
                "schedule"
            );

            // Save the schedule data to the specified collection path
            await setDoc(doc(targetCollectionPath), scheduleData);
            console.log(`Schedule copied to finalSchedule > A.Y. ${academicYear} > ${selectedSemester} > COED > schedule.`);

            // Clear fields in the original document without deleting it
            const clearedData = {};
            Object.keys(scheduleData).forEach(field => {
                clearedData[field] = deleteField();
            });
            await setDoc(sourceDocRef, clearedData, { merge: true });
            console.log("Fields cleared in GenerateSchedule > COED_Schedule.");
        } else {
            console.log("No schedule found to save.");
        }
    } catch (error) {
        console.error("Error saving and clearing schedule:", error);
    }
}

// Main Genetic Algorithm Execution
export async function main() {
    try {
        // Get selected academic year and semester from the UI
        const startYear = document.getElementById("startYear").value;
        const endYear = document.getElementById("endYear").value;
        const academicYear = `${startYear}-${endYear}`;
        const selectedSemester = document.getElementById("semester").value;

        if (!startYear || !endYear || !selectedSemester) {
            console.error('Start Year, End Year, and Semester must be selected!');
            return;
        }

        console.log('Fetching COED faculty data...');
        const coedFacultyData = await fetchCOEDFaculty();
        console.log(`Fetched ${coedFacultyData.length} COED faculty members.`);

        console.log('Fetching section data...');
        const sectionData = await fetchSections();
        console.log(`Fetched ${sectionData.length} sections.`);

        console.log(`Fetching course data for Academic Year: ${academicYear}, Semester: ${selectedSemester}`);
        const courseData = await fetchCourses(selectedSemester, academicYear);
        if (!Array.isArray(courseData) || courseData.length === 0) {
            console.error('No valid course data fetched or courseData is not an array.');
            return;  // Stop if courseData is invalid
        }

        console.log("Fetched courseData in main():", courseData);

        console.log('Running Genetic Algorithm...');
        let { bestChromosome, bestFitness } = await geneticAlgorithm(coedFacultyData, courseData, sectionData, 50, 100, 0.05);
        console.log('Genetic Algorithm completed.');
        console.log(`Best Fitness Score: ${bestFitness}`);

        console.log('Assigning fixed days and times to certain courses...');
        bestChromosome = assignFixedDayAndTime(bestChromosome);

        console.log('Fetching room data...');
        const roomData = await fetchRooms();
        console.log(`Fetched ${roomData.length} rooms.`);

        console.log('Assigning rooms to the best chromosome...');
        let bestChromosomeWithRooms = assignRooms(bestChromosome, roomData);
        console.log('Room assignment completed.');

        console.log('Assigning day and time slots to courses...');
        const bestChromosomeWithSchedule = await assignDayAndTimeWithExternalCheck(bestChromosomeWithRooms, academicYear, selectedSemester);
        console.log('Day and time assignment completed.');

        console.log('Saving the best assignment...');
        await saveBestAssignment(bestChromosomeWithSchedule, bestFitness, academicYear, selectedSemester);
        console.log('Best assignment saved successfully.');

    } catch (error) {
        console.error('Error:', error);
    }
}

window.main = main;
window.saveAndClearSchedule = saveAndClearSchedule;