import mongoose from 'mongoose';

const ExercisesSchema = mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required: [true, 'Please enter a name'],
    },
    creator: {
        type: String,
        default: '',
    },
    description: {
        type: String,
        default: 'None',
    },
    primaryMuscle: {
        type: String,
        required: [true, 'Please select a primary muscle'],
    },
    otherMuscles: {
        type: Array,
        default: [],
    },
    equipment: {
        type: String,
        required: [true, 'Please select an equipment type']
    },
    isVisible: {
        type: Boolean,
        default: false,
    },
})

const Exercise = mongoose.model('Exercise', ExercisesSchema);

export default Exercise;