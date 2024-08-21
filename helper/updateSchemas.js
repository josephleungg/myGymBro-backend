import mongoose from 'mongoose';
import User from '../models/users.model.js'

export default async function updateUsers() {
    try {
        await User.updateMany(
          {}, // Filter for all documents
          { $set: { mealDays: [] } } // Set 'mealDays' to an empty array for all documents
        );
        console.log('All documents updated successfully.');
      } catch (error) {
        console.error('Error updating documents:', error);
      }
}