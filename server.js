const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid"); // UUID generation for unique IDs
const app = express();
const PORT = process.env.PORT || 4000;
const BASE_PATH = "./data"; // Directory for storing JSON files
const date = require("./helpers/date");

app.use(cors());
app.use(express.json()); // Middleware to parse JSON requests

// Utility Functions for JSON File Operations
const readData = (file) => {
    const filePath = path.join(BASE_PATH, file);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
};

const writeData = (file, data) => {
    const filePath = path.join(BASE_PATH, file);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
};

// -----------------------------------
// File Names for Persistent Data
// -----------------------------------
const USERS_FILE = "users.json"; // Stores users
const BOOKINGS_FILE = "bookings.json"; // Stores bookings
const CARS_FILE = "cars.json"; // Stores cars
const FEEDBACKS_FILE = "feedbacks.json"; // Stores feedbacks
const LOCATIONS_FILE = "locations.json"; // Stores locations
const REPORTS_FILE = "reports.json"; // Stores reports

const ABOUT_US_FILE = [
    {
        "title": "Years in Business",
        "numericValue": 15,
        "description": "We have been delivering outstanding services for 15 years."
    },
    {
        "title": "Satisfied Clients",
        "numericValue": 500,
        "description": "We have served over 500 happy clients worldwide."
    },
    {
        "title": "Locations",
        "numericValue": 20,
        "description": "Operating in 20 different locations globally."
    }
];

const FAQ = [
    {
        "question": "What documents do I need to rent a car?",
        "answer": "To rent a car, you will need a valid driver's license, a credit card in your name, and a government-issued photo ID. International renters may need an International Driving Permit in addition to their home country driver’s license."
    },
    {
        "question": "What is the minimum age to rent a car?",
        "answer": "The minimum age to rent a car is typically 21 years, but this can vary depending on the rental location and car category. Drivers under 25 years may incur a young driver surcharge."
    },
    {
        "question": "Can I cancel or modify my booking?",
        "answer": "Yes, you can cancel or modify your booking. Free cancellations are available up to 24 hours before the scheduled pickup. Additional charges may apply for modifications."
    },
    {
        "question": "Are there any additional charges apart from the rental fee?",
        "answer": "Yes, additional charges such as insurance, fuel charges, toll fees, and young driver or additional driver fees may apply. All charges will be detailed in the rental agreement."
    }];

// Auth - US-1: Sign Up
// -----------------------------------
app.post("/api/v1/auth/sign-up", (req, res) => {
    const { email, firstName, lastName, password } = req.body;

    const users = readData(USERS_FILE);

    if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ error: "Missing required fields." });
    }

    if (users.find((u) => u.email === email)) {
        return res.status(400).json({ error: "User already exists." });
    }

    const newUser = {
        id: uuidv4(),
        email,
        firstName,
        lastName,
        password,
        role: "Client",
    };

    users.push(newUser);
    writeData(USERS_FILE, users);

    return res.status(201).json({ message: "User successfully created" });
});

// -----------------------------------
// Auth - US-2: Sign In
// -----------------------------------
app.post("/api/v1/auth/sign-in", (req, res) => {
    const { email, password } = req.body;

    const users = readData(USERS_FILE);

    const user = users.find((u) => u.email === email && u.password === password);
    if (!user) {
        return res.status(400).json({ error: "Invalid email or password." });
    }

    const token = `token-${user.id}`;
    return res.status(200).json({
        // accessToke: "",
        // refreshToken: "",
        user: user,
    });
});

app.post("/api/v1/getUser", (req, res) => {
    const { token } = req.body;
    if (token === "authUser") {
        const users = readData(USERS_FILE);
        return res.status(200).json({
            users: users
        });
    }
    return res.status(400).json({
        "message": "Not Authenticated"
    });
});

app.get("/api/v1/home/about-us", (req, res) => {
    try {
        const aboutData = ABOUT_US_FILE; // Load JSON data
        return res.status(200).json({ "content": aboutData });
    } catch (error) {
        console.error("Error reading about.json file:", error.message);
        return res.status(500).json({ error: "Could not load About Us data." });
    }
});

app.get("/api/v1/home/faq", (req, res) => {
    try {
        const aboutData = FAQ; // Load JSON data
        return res.status(200).json({ "content": aboutData });
    } catch (error) {
        console.error("Error reading about.json file:", error.message);
        return res.status(500).json({ error: "Could not load About Us data." });
    }
});

app.get("/api/v1/home/locations", (req, res) => {
    try {
        const aboutData = readData(LOCATIONS_FILE); // Load JSON data
        return res.status(200).json({ "content": aboutData });
    } catch (error) {
        console.error("Error reading about.json file:", error.message);
        return res.status(500).json({ error: "Could not load About Us data." });
    }
});


// -----------------------------------
// Car - US-5: Car selection (list cars)
// -----------------------------------
app.get("/api/v1/getAllCars", (req, res) => {
    const cars = readData(CARS_FILE); // Load cars data from JSON file
    const { page = 1, size = 10 } = req.body; // Extract pagination parameters

    console.log(page, size);

    // Pagination Logic
    const totalElements = cars.length;
    const totalPages = Math.ceil(totalElements / size);
    const startIndex = (page - 1) * size; // Calculate start index
    const paginatedCars = cars.slice(startIndex, startIndex + parseInt(size)); // Paginate results

    return res.status(200).json({
        content: paginatedCars,
        currentPage: parseInt(page), // Current page number
        totalElements,
        totalPages,
    });
});


app.get("/api/v1/cars", (req, res) => {
    const cars = readData(CARS_FILE); // Load cars data from JSON file
    let filteredCars = [...cars]; // Clone cars array to apply filters

    // Extract query parameters
    const {
        pickupLocationId,
        dropOffLocationId,
        pickupDateTime,
        dropOffDateTime,
        category,
        gearBoxType,
        fuelType,
        minPrice,
        maxPrice,
        page = 1,  // Default page as 1
        size = 10, // Default size as 10
    } = req.query;

    // Filtering logic based on query params
    if (pickupLocationId) {
        filteredCars = filteredCars.filter((c) => c.pickupLocationId === pickupLocationId);
    }
    if (dropOffLocationId) {
        filteredCars = filteredCars.filter((c) => c.dropOffLocationId === dropOffLocationId);
    }
    if (category) {
        filteredCars = filteredCars.filter((c) => c.category === category);
    }
    if (gearBoxType) {
        filteredCars = filteredCars.filter((c) => c.gearBoxType === gearBoxType);
    }
    if (fuelType) {
        filteredCars = filteredCars.filter((c) => c.fuelType === fuelType);
    }
    if (minPrice) {
        filteredCars = filteredCars.filter((c) => c.pricePerDay >= parseFloat(minPrice));
    }
    if (maxPrice) {
        filteredCars = filteredCars.filter((c) => c.pricePerDay <= parseFloat(maxPrice));
    }

    // Pagination Logic
    const totalElements = filteredCars.length;
    const totalPages = Math.ceil(totalElements / size);
    const startIndex = (page - 1) * size; // Calculate start index
    const paginatedCars = filteredCars.slice(startIndex, startIndex + parseInt(size)); // Paginate results

    // Map to include only required properties
    const resultCars = paginatedCars.map((c) => ({
        carId: c?.carId,
        carRating: c.carRating,
        imageUrl: c.images?.[0],
        location: c.location,
        model: c.model,
        pricePerDay: c.pricePerDay,
        serviceRating: c.serviceRating,
        status: c.status,
    }));

    // Send response with filtered and paginated data
    return res.status(200).json({
        content: resultCars,
        currentPage: parseInt(page), // Current page number
        totalElements,
        totalPages,
    });
});

app.post("/api/v1/cars/popular", (req, res) => {
    try {
        const cars = readData(CARS_FILE); // Load cars data from JSON file
        const { page = 1, size = 10 } = req.body; // Extract filters and pagination parameters


        // Sort cars by rating in descending order
        const sortedCars = cars.sort((a, b) => b.carRating - a.carRating);

        // Pagination logic
        const totalElements = sortedCars.length;
        const totalPages = Math.ceil(totalElements / size);
        const startIndex = (page - 1) * size;
        const paginatedCars = sortedCars.slice(startIndex, startIndex + parseInt(size));

        // Map to include only required properties
        const resultCars = paginatedCars.map((car) => ({
            carId: car.carId,
            carRating: car.carRating,
            imageUrl: car.images?.[0],
            location: car.location,
            model: car.model,
            pricePerDay: car.pricePerDay,
            serviceRating: car.serviceRating,
            status: car.status,
        }));

        // Send response with filtered, sorted, and paginated data
        res.status(200).json({
            content: resultCars,
            currentPage: parseInt(page),
            totalElements,
            totalPages,
        });
    } catch (error) {
        console.error("Error fetching popular cars:", error.message);
        res.status(500).json({ error: "An error occurred while fetching popular cars." });
    }
});

// -----------------------------------
// Booking - US-6: Book a car
// -----------------------------------
app.post("/api/v1/bookings", (req, res) => {
    const { carId, clientId, pickupDateTime, dropOffDateTime, pickupLocationId, dropOffLocationId } = req.body;

    const cars = readData(CARS_FILE);
    const bookings = readData(BOOKINGS_FILE);

    const car = cars.find((c) => c.carId === carId);
    if (!car) return res.status(404).json({ error: "Car not found." });

    // Check for existing booking conflicts
    const existingBooking = bookings.find(
        (b) =>
            b.carId === carId &&
            ((new Date(pickupDateTime) >= new Date(b.pickupDateTime) && new Date(pickupDateTime) <= new Date(b.dropOffDateTime)) ||
                (new Date(dropOffDateTime) >= new Date(b.pickupDateTime) && new Date(dropOffDateTime) <= new Date(b.dropOffDateTime)))
    );

    if (existingBooking) {
        return res.status(400).json({
            message: `The car is already booked from ${existingBooking.pickupDateTime} to ${existingBooking.dropOffDateTime}. Please choose a different time.`,
        });
    }

    const booking = {
        bookingId: uuidv4(),
        carId,
        clientId,
        bookingStatus: "RESERVED",
        pickupDateTime,
        dropOffDateTime,
        pickupLocationId,
        dropOffLocationId,
    };

    bookings.push(booking);
    writeData(BOOKINGS_FILE, bookings);

    return res.status(200).json({
        message: `New booking was successfully created. \n${car.model} is booked from ${date.formatDate(pickupDateTime)} to ${date.formatDate(dropOffDateTime)}. \nYou can change booking details until 24 hours before the pickup time.\nYour order: #${booking.bookingId}`,
    });
});


// -----------------------------------
// Booking - Get all bookings
// -----------------------------------
app.get("/api/v1/bookings", (req, res) => {
    try {
        const bookings = readData(BOOKINGS_FILE); // Load bookings data from JSON file
        return res.status(200).json({
            content: bookings,
        });
    } catch (error) {
        console.error("Error fetching bookings:", error.message);
        return res.status(500).json({ error: "An error occurred while fetching bookings." });
    }
});

// -----------------------------------
// Booking - US-6: Get user's bookings
// -----------------------------------
app.get("/api/v1/cars/:carId", (req, res) => {
    const { carId } = req.params;
    const cars = readData(CARS_FILE);

    const Car = cars.filter((c) => c.carId === carId)[0];
    return res.status(200).json({
        carId: Car.carId,
        carRating: Car.carRating,
        climateControlOption: Car.climateControl,
        engineCapacity: Car.engineCapacity,
        fuelConsumption: Car.fuelConsumption,
        fuelType: Car.fuelType,
        gearBoxType: Car.gearBoxType,
        images: Car.images,
        location: Car.location,
        model: Car.model,
        passengerCapacity: Car.passengerCapacity,
        pricePerDay: Car.pricePerDay,
        serviceRating: Car.serviceRating,
        status: Car.status,
    });
});


app.get("/api/v1/bookings/:userId", (req, res) => {
    const { userId } = req.params;
    const bookings = readData(BOOKINGS_FILE);
    const cars = readData(CARS_FILE);

    const userBookings = bookings.filter((b) => b.clientId === userId);
    const response = userBookings.map((b) => {
        return {
            bookingId: b.bookingId,
            bookingStatus: b.bookingStatus,
            carImageUrl: cars.find(c => b.carId === c.carId).images[0],
            carModel: cars.find(c => b.carId === c.carId).model,
            orderDetails: b.bookingId + " " + b.pickupDateTime.slice(0, 10),
        }
    });
    return res.status(200).json({
        content:
            response

    });
});

// -----------------------------------
// Feedback - US-8: Provide feedback
// -----------------------------------
app.post("/api/v1/feedbacks", (req, res) => {
    const { carId, clientId, feedbackText, rating } = req.body;

    if (!carId || !clientId || !feedbackText || !rating) {
        return res.status(400).json({ error: "Missing required fields." });
    }

    const feedbacks = readData(FEEDBACKS_FILE);
    const newFeedback = {
        id: `${feedbacks.length + 1}`,
        carId,
        clientId,
        feedbackText,
        rating,
    };

    feedbacks.push(newFeedback);
    writeData(FEEDBACKS_FILE, feedbacks);

    return res.status(201).json({
        feedbackId: newFeedback.id,
        systemMessage: "Feedback has been successfully created",
    });
});

// -----------------------------------
// Feedback - US-4: Recent feedbacks
// -----------------------------------
app.get("/api/v1/feedbacks/recent", (req, res) => {
    const feedbacks = readData(FEEDBACKS_FILE);

    return res.status(200).json({
        content: feedbacks.slice(-5),
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});