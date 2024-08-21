import mongoose from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcrypt';

const UsersSchema = mongoose.Schema({
    username: {
        type: String,
        unique: true,
        required: [true, 'Please enter a username'],
    },
    email: {
        type: String,
        unique: true,
        required: [true, 'Please enter an email'],
        validate: [validator.isEmail,'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Please enter a password'],
        minLength: [6, 'Minimum password length is 6 characters']
    },
    name: { 
        type: String, 
        default: '' 
    },
    age: { 
        type: Number, 
        default: 0 
    },
    bio: { 
        type: String, 
        default: '', 
        maxlength: 256
    },
    sex: { 
        type: String, 
        default: '' 
    },
    weight: { 
        type: Number, 
        default: 0 
    },
    height: { 
        type: Number, 
        default: 0 
    },
    bodyFat: { 
        type: Number, 
        default: 0 
    },
    daysAtGym: { 
        // Array contains Arrays of an object with a workout that the user has done for the workout
        // This will contain currentWorkout once the user has finished the workout
        type: Array, 
        default: [] 
    },
    progressPics: { 
        type: Array, 
        default: [] 
    },
    currentWorkout: { 
        // *CLEAR THIS ONCE THE USER HAS FINISHED THE WORKOUT*
        // This will save the workout if the user decides to exit the app before ending the workout
        // Array contains
        // workoutName: String
        // workoutNotes: String
        // duration: Number of minutes
        // date: Date String
        //////////////
        // OBJECTS //
        // Exercise Object ID: Arrays of Object ID
        // sets: Array of number of reps per set
        // weight: Array of weight per set
        // ["test", 60, "April 20 2024", {"id": "350983452", "sets": [6,8,10], "weight": [100, 120, 140], "date": [April 20 2024, April 20 2024, April 20 2024]}, {"id": "350983452", "sets": [6,8,10], "weight": [190, 100, 160], "date": [April 20 2024, April 20 2024, April 20 2024]}]
        type: Array,
        default: []
    },
    mealDays: {
        type: Array,
        default: []
    },
    dateCreated: {
        type: Date,
        default: Date.now
    }
});

// hash password before saving to db
UsersSchema.pre('save', async function (next){
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// method to login user
UsersSchema.statics.login = async function(email, password){
    const user = await this.findOne({ email: email });
    if(user){
        const auth = await bcrypt.compare(password, user.password);
        if(auth){
            return user;
        }
        throw Error('password is incorrect');
    }
    throw Error(`email doesn't exist`);
}

const User = mongoose.model('User', UsersSchema);

export default User;