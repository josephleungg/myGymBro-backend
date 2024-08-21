import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose';
import User from './models/users.model.js'
import Exercise from './models/exercises.model.js'
import UserExercise from './models/userexercise.model.js'
import Meal from './models/meals.model.js'
import updateUsers from './helper/updateSchemas.js'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import { config } from 'dotenv';
config();

// connecting to the database
mongoose.connect(process.env.MONGODB_URL)
  .then(() => console.log('Connected to db!'))
  .catch((e) => {console.log(e)});

// initialize express
const app = express()
app.use(cors())
app.use(express.json())
app.use(cookieParser())

const maxLoginTime = 2592000000; // time for expiry of Token

// create a JWT function
function createToken(id) {
    return jwt.sign({ id }, 'myGymBrosecretkey', { expiresIn: maxLoginTime });
}

// UPDATING SCHEMAS
// Update Schemas API, MUST CHANGE THE FUNCTION EVERYTIME YOU CHANGE ANYTHING ELSE TO IT
app.get('/updateUsers', async (req, res) => {
    try{
        await updateUsers();
        res.status(200).json({'message': 'updating users'})
    }catch(e){
        res.status(500).json({'message': e})
    }
});

// ACCOUNT CREATION AND LOGIN
// signup API
app.post('/signup', async (req, res) => {
    
    try {
        const user = await User.create(req.body);
        const token = createToken(user._id);

        // create jwt cookie to instantly login the user
        res.cookie('jwt', token, { httpOnly: true, maxAge: maxLoginTime });
        res.status(200).json({ user: user._id });
    } catch (error) {

        // checking for empty required fields
        if(error.message.includes('User validation failed:')){
            let errorMessages = { username: '', email: '', password: '' };

            Object.values(error.errors).forEach(error => {
                errorMessages[error.path] = error.properties.message;
            });
        
            let returnMessage = { 'message': "" };

            Object.values(errorMessages).forEach(error => {
                if(error !== ''){
                    returnMessage['message'] += error + '. ';
                };
            });

            res.status(500).json(returnMessage)

        // error checking for duplicate username and email
        }else if(error.code === 11000){
            res.status(500).json({'message': 'Username or email already exists'})
            console.log('Username or email already exists')
        // error checking for any other error
        }else{
            res.status(500).json({'message': 'An error has occured, please try again'})
            console.log('An error has occured, please try again')
        }
    }

});

// api call for login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.login(email, password);
        const token = createToken(user._id);
        res.cookie('jwt', token, { httpOnly: true, maxAge: maxLoginTime });
        res.status(200).json({ user: user._id });
        console.log('User logged in successfully')
    }catch(e){
        res.status(400).json({ 'message': e.message })
        console.log(e.message)
    }
});

// Reset Cookies
app.get('/clear_cookies', (req, res) => {
    if (req.cookies) {
        Object.keys(req.cookies).forEach(cookieName => {
            res.clearCookie(cookieName);
        });
        console.log('User logged out successfully')
        res.json('All cookies cleared');
    } else {
        res.json('No cookies to clear');
    }
});

// middleware to verify JWT for other routes
const verifyJWT = (req, res, next) => {
    const token = req.cookies.jwt;
    if(token){
        jwt.verify(token, 'myGymBrosecretkey', (err, decodedToken) => {
            if(err){
                console.log('jwt is invalid')
                res.status(400).json({ 'message': 'jwt is invalid' });
            }else{
                console.log('user is authenticated')
                req.id = decodedToken.id;
                next();
            }
        });
    }else{
        console.log('tried to verify jwt but user is not authenticated')
        res.status(400).json({ 'message': 'not authenticated' });
    }
};

// route used for initial check of JWT at login
app.get('/verifyjwt', (req, res) => {
    const token = req.cookies.jwt;
    if(token){
        jwt.verify(token, 'myGymBrosecretkey', (err, decodedToken) => {
            if(err){
                console.log('jwt is invalid')
                res.status(400).json({ 'message': 'jwt is invalid' });
            }else{
                console.log('id: ' + decodedToken.id)
                res.status(200).json({ id: decodedToken.id });
            }
        });
    }else{
        console.log('tried to verify jwt but user is not authenticated')
        res.status(400).json({ 'message': 'not authenticated' });
    }
});

// get cookies for testing
app.get('/get_cookies', (req, res) => {
    res.json(req.cookies);
});

// getting user data
app.get('/get_user_data', async (req, res) => {

    // using query string instead of body
    const user_id = req.query.id

    // find user by id in the collection
    const user = await User.findById(user_id)

    if(user){
        console.log('User found')
        res.status(200).json(user)
    }else{
        res.status(400).json({ 'message': 'user not found' })
    }
});

// CHANGING DATABASE USER DOCUMENT
// edit profile API
app.put('/edit_profile', async (req, res) => {

    // getting the user id from the query string
    const user_id = req.query.id

    // getting the data from the response body
    const data = req.body

    try {
        // find user by the id and update the data
        const user = await User.findByIdAndUpdate(user_id, {$set: data}, { new: true, runValidators: true });

        if(user){
            res.status(200).json({ 'message': 'Profile updated successfully' })
        }else{
            res.status(400).json({ 'message': 'user not found' })
        }
    }catch(error){
        res.status(400).json({ 'message': error.message })
    }
});

// change user password
app.put('/change_password', verifyJWT, async (req, res) => {
    const user_id = req.id

    res.status(200).send({"message": "Password changed successfully"})
})

// EXERCISES DATABASE
// show all exercises list
app.get('/exercises_list', verifyJWT, async (req, res) => {
    try{
        const documents = await Exercise.find({$or: [{ creator: req.id }, { isVisible: true }]})
        const exercisesList = {}
    
        for(let i = 0;i < documents.length;i++){
            exercisesList[i+1] = documents[i]
        }

        console.log("Exercises list successfully retrieved")
        res.status(200).json(exercisesList)
    }catch(e){
        res.status(500).json({'message': e})
    }
})

// create new exercise
app.put('/create_exercise', verifyJWT, async (req, res) => {
    const exerciseReq = {
        name: req.body.name,
        creator: req.id, // don't need to include this in the request body because it is included in the JWT verification
        description: req.body.description,
        primaryMuscle: req.body.primaryMuscle,
        otherMuscles: req.body.otherMuscles,
        equipment: req.body.equipment,
        isVisible: req.body.isVisible
    }

    try{
        await Exercise.create(exerciseReq)
        res.status(200).json({'message': 'Exercise created successfully'})
    }catch(e){
        // checking for empty required fields
        if(e.message.includes('Exercise validation failed:')){
            let errorMessages = { name: '', primaryMuscle: '', equipment: '' };

            Object.values(e.errors).forEach(error => {
                errorMessages[error.path] = error.properties.message;
            });
        
            let returnMessage = { 'message': "" };

            Object.values(errorMessages).forEach(error => {
                if(error !== ''){
                    returnMessage['message'] += error + '. ';
                };
            });

            res.status(500).json(returnMessage)
        }else if(e.code === 11000){
            res.status(500).json({'message': 'Exercise name already exists'})
            console.log('Exercise name already exists')
        // error checking for any other error
        }else{
            res.status(500).json({'message': 'An error has occured, please try again'})
            console.log('An error has occured, please try again')
        }
    }
})

// delete exercise
app.delete('/delete_exercise', verifyJWT, async (req, res) => {
    // BODY MUST BE { _id: exercise_id }
    try{
        const exercise_id = req.body._id;
        const creator_id = await Exercise.findById(exercise_id)

        // checking if the req.id which comes from verifyJWT is the same as the creator of the exercise
        if(req.id !== creator_id.creator){
            throw new Error('User is not authorized to delete this exercise')
        }

        // put exercise id in the request body as _id
        await Exercise.findByIdAndDelete(exercise_id)
        res.status(200).json({'message': 'Exercise deleted successfully'})
    }catch(e){
        res.status(500).json({'message': e.message})
    }
})

// route to get exercise data
app.get('/get_exercise', verifyJWT, async (req, res) => {
    // QUERY STRING MUST BE { id: exercise_id }
    try{
        const exercise_id = req.query.id;
        const exercise = await Exercise.findById(exercise_id)
        const creatorName = await User.findById(exercise.creator)

        let exerciseObj = exercise.toObject()
        exerciseObj.creatorName = creatorName.username
        res.status(200).json(exerciseObj)
    }catch(e){
        res.status(500).json({'message': e})
    }
})

// MEALS DATABASE
// show all exercises list
app.get('/meals_list', verifyJWT, async (req, res) => {
    try{
        const documents = await Meal.find({$or: [{ creator: req.id }, { isVisible: true }]})
        const mealList = {}
    
        for(let i = 0;i < documents.length;i++){
            mealList[i+1] = documents[i]
        }

        console.log("Meal list successfully retrieved")
        res.status(200).json(mealList)
    }catch(e){
        res.status(500).json({'message': e})
    }
})

// create new meal
app.put('/create_meal', verifyJWT, async (req, res) => {
    const mealReq = {
        name: req.body.name,
        creator: req.id, // don't need to include this in the request body because it is included in the JWT verification
        description: req.body.description,
        calories: req.body.calories,
        protein: req.body.protein,
        carbs: req.body.carbs,
        fats: req.body.fats,
        isVisible: req.body.isVisible
    }

    try{
        const meal = await Meal.create(mealReq)
        res.status(200).json({'message': 'Meal created successfully'})
    }catch(e){
        // checking for empty required fields
        if(e.message.includes('Meal validation failed:')){
            let errorMessages = { name: '' };

            Object.values(e.errors).forEach(error => {
                errorMessages[error.path] = error.properties.message;
            });
        
            let returnMessage = { 'message': "" };

            Object.values(errorMessages).forEach(error => {
                if(error !== ''){
                    returnMessage['message'] += error + '. ';
                };
            });

            res.status(500).json(returnMessage)
        }else if(e.code === 11000){
            res.status(500).json({'message': 'Meal name already exists'})
            console.log('Meal name already exists')
        // error checking for any other error
        }else{
            res.status(500).json({'message': 'An error has occured, please try again'})
            console.log('An error has occured, please try again')
        }
    }
})

// delete meal
app.delete('/delete_meal', verifyJWT, async (req, res) => {
    // BODY MUST BE { _id: meal_id }

    try{
        const meal_id = req.body._id;
        const creator_id = await Meal.findById(meal_id)

        // checking if the req.id which comes from verifyJWT is the same as the creator of the meal
        if(req.id !== creator_id.creator){
            throw new Error('User is not authorized to delete this meal')
        }

        // put meal id in the request body as _id
        const result = await Meal.findByIdAndDelete(meal_id)
        res.status(200).json({'message': 'Meal deleted successfully'})
    }catch(e){
        res.status(500).json({'message': e.message})
    }
})

// WORKOUT SESSION ROUTES
// Route for finishing the user's workout session
app.patch('/finish_workout', verifyJWT, async (req, res) => {
    // body must contain the workout session data { workout: array containing the workout info, duration: number }
    try {
        let workoutDetails = req.body.workout
        workoutDetails[2] = req.body.duration
        // Updating daysAtGym array with the workout session
        const updateDaysAtGym = await User.findByIdAndUpdate(req.id, { $push: { daysAtGym: workoutDetails } })

        // Clearing the current workout array
        const clearCurrentWorkout = await User.findByIdAndUpdate(req.id, { $set: { currentWorkout: [] } })

        // checking through all of the exercises in the workout session to see if the user has progressed
        // also updating the user's set weight for the charts
        for(let i = 4;i < req.body.workout.length;i++){
            let updateUserExercises = await UserExercise.findOne({ userID: req.id, exerciseID: req.body.workout[i]["id"] })
            if(updateUserExercises){
                const maxWeightInSets = Math.max(...req.body.workout[i]["weight"])
                // if the user has done the exercise before
                // check if the user has progressed
                // update the user's set weight for the charts
                updateUserExercises.pastSetWeight = [...updateUserExercises.pastSetWeight, ...req.body.workout[i]["weight"].flat()]
                updateUserExercises.pastSetReps = [...updateUserExercises.pastSetReps, ...req.body.workout[i]["sets"].flat()]
                updateUserExercises.pastDates = [...updateUserExercises.pastDates, ...req.body.workout[i]["date"].flat()]

                // update user's PR
                if(maxWeightInSets > updateUserExercises.personalRecord){
                    updateUserExercises.personalRecord = maxWeightInSets
                    updateUserExercises.personalRecordDate = req.body.workout[i]["date"][0]
                }

                await updateUserExercises.save()
            }else{
                // if the user has not done the exercise before
                // create a new UserExercise document
                const newUserExercise = {
                    userID: req.id,
                    exerciseID: req.body.workout[i]["id"],
                    pastSetWeight: req.body.workout[i]["weight"],
                    pastSetReps: req.body.workout[i]["sets"],
                    pastDates: req.body.workout[i]["date"],
                    personalRecord: Math.max(...req.body.workout[i]["weight"]),
                    personalRecordDate: req.body.workout[i]["date"][0]
                }

                await UserExercise.create(newUserExercise)
            }
        }

        console.log('Workout session added to daysAtGym successfully')
        res.status(200).json({'message': 'Workout session saved successfully'})
    }catch(e){
        res.status(500).json({'message': e.message})
    }
})

// save the current workout if the user exits the app before finishing the workout
app.patch('/save_current_workout', verifyJWT, async (req, res) => {
    // body must contain the workout session data { workout: array containing the workout info }
    const currentWorkout = req.body.workout
    try{
        const userCurrentWorkout = await User.findByIdAndUpdate(req.id, { $set: { currentWorkout: currentWorkout } })
        res.status(200).json({'message': 'Current workout saved successfully'})
    }catch(e){
        res.status(500).json({'message': e.message})
    }
})

// route for clearing the current workout once the user returns to the workout tracker page
app.patch('/clear_current_workout', verifyJWT, async (req, res) => {
    try{
        const clearCurrentWorkout = await User.findByIdAndUpdate(req.id, { $set: { currentWorkout: [] } })
        res.status(200).json({'message': 'Current workout cleared successfully'})
    }catch(e){
        res.status(500).json({'message': e.message})
    }
})

// route for getting all of the user's workout sessions for the homepage
app.get('/get_workout_sessions', verifyJWT, async (req, res) => {
    try{
        const userWorkouts = await User.findById(req.id)
        res.status(200).json(userWorkouts.daysAtGym)
    }catch(e){
        res.status(500).json({'message': e.message})
    }
})

// route for getting the user's last workout data for a specific exercise for individual workout ID page
app.get('/get_userexercise_info', verifyJWT, async (req, res) => {
    // query string must contain the exercise id ?id=exercise_id
    try{
        const userExercise = await UserExercise.findOne({ userID: req.id, exerciseID: req.query.id })
        if(userExercise){
            res.status(200).json(userExercise)
        }else{
            res.status(204).json({'message': 'User has not done this exercise before'})
        }
    }catch(e){
        res.status(500).json({'message': e.message})
    }
});

app.listen(5000, () => {
    console.log('server is running on port 5000')
});