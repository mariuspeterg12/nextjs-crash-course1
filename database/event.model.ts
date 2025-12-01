import { Schema, model, models, Document, Model } from 'mongoose';

/**
 * Event document shape used by Mongoose and TypeScript.
 */
export interface IEvent extends Document {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string; // Stored as ISO date string (YYYY-MM-DD)
  time: string; // Stored as 24h time (HH:mm)
  mode: string;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Helper to generate a URL-friendly slug from a title.
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // replace non-alphanumeric with dashes
    .replace(/^-+|-+$/g, ''); // trim leading/trailing dashes
}

/**
 * Event schema definition with strong typing and validation.
 */
const eventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (value: string): boolean => value.trim().length > 0,
        message: 'Title is required',
      },
    },
    slug: {
      type: String,
      unique: true,
      index: true, // unique index for fast lookup by slug
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    overview: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    venue: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
      trim: true,
    },
    time: {
      type: String,
      required: true,
      trim: true,
    },
    mode: {
      type: String,
      required: true,
      trim: true,
    },
    audience: {
      type: String,
      required: true,
      trim: true,
    },
    agenda: {
      type: [String],
      required: true,
      validate: {
        // Ensure agenda is a non-empty list of items
        validator: (value: string[]): boolean => Array.isArray(value) && value.length > 0,
        message: 'Agenda must contain at least one item',
      },
    },
    organizer: {
      type: String,
      required: true,
      trim: true,
    },
    tags: {
      type: [String],
      required: true,
      validate: {
        // Ensure tags is a non-empty list of strings
        validator: (value: string[]): boolean => Array.isArray(value) && value.length > 0,
        message: 'Tags must contain at least one tag',
      },
    },
  },
  {
    timestamps: true, // automatically manage createdAt and updatedAt
  }
);

/**
 * Pre-save hook to:
 * - Generate or regenerate slug when the title changes
 * - Normalize and validate date and time fields
 */
eventSchema.pre('save', function (next) {
  const event = this as IEvent;

  // Generate slug only when the title is modified.
  if (event.isModified('title') || !event.slug) {
    event.slug = generateSlug(event.title);
  }

  // Normalize date to ISO (YYYY-MM-DD).
  if (event.isModified('date')) {
    const parsedDate = new Date(event.date);

    if (Number.isNaN(parsedDate.getTime())) {
      return next(new Error('Invalid date format. Expected a valid date string.'));
    }

    // Keep only the date part in ISO 8601 (e.g., 2025-12-01).
    event.date = parsedDate.toISOString().split('T')[0];
  }

  // Normalize time to HH:mm (24-hour clock).
  if (event.isModified('time')) {
    const timeMatch = event.time.match(/^(\d{1,2}):(\d{2})$/);

    if (!timeMatch) {
      return next(new Error('Invalid time format. Expected HH:mm.'));
    }

    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return next(new Error('Invalid time value. Hour must be 0-23 and minute 0-59.'));
    }

    // Pad to always store as HH:mm (e.g., 09:05).
    event.time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  next();
});

/**
 * Ensure a unique index on slug at the schema level.
 */
eventSchema.index({ slug: 1 }, { unique: true });

/**
 * Event model: reuses existing model in dev to avoid OverwriteModelErrors.
 */
export const Event: Model<IEvent> =
  (models.Event as Model<IEvent> | undefined) || model<IEvent>('Event', eventSchema);
