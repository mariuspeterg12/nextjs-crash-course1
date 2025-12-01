import { Schema, model, models, Document, Model, Types } from 'mongoose';
import { Event } from './event.model';

/**
 * Booking document shape used by Mongoose and TypeScript.
 */
export interface IBooking extends Document {
  eventId: Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Simple email format validator for application-level checks.
 */
function isValidEmail(email: string): boolean {
  // Basic RFC 5322-compatible pattern suitable for most application use cases.
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Booking schema definition with strong typing and validation.
 */
const bookingSchema = new Schema<IBooking>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true, // index for faster queries by event
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value: string): boolean => isValidEmail(value),
        message: 'Email must be a valid email address',
      },
    },
  },
  {
    timestamps: true, // automatically manage createdAt and updatedAt
  }
);

/**
 * Pre-save hook to:
 * - Ensure the referenced event exists
 * - Re-validate email format before persisting
 */
bookingSchema.pre('save', async function (next) {
  const booking = this as IBooking;

  // Verify that the referenced event exists before saving the booking.
  const eventExists = await Event.exists({ _id: booking.eventId });
  if (!eventExists) {
    return next(new Error('Cannot create booking: referenced event does not exist.'));
  }

  // Double-check email format at save-time (defensive validation).
  if (!isValidEmail(booking.email)) {
    return next(new Error('Email must be a valid email address.'));
  }

  next();
});

/**
 * Booking model: reuses existing model in dev to avoid OverwriteModelErrors.
 */
export const Booking: Model<IBooking> =
  (models.Booking as Model<IBooking> | undefined) || model<IBooking>('Booking', bookingSchema);
