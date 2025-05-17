import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ClubMember, ClubMemberTypes, PrismaClient } from '@prisma/client';
import { apiError, apiResponse } from '../utils/response';
import { Request, Response } from 'express';

const router = express.Router();
const prisma = new PrismaClient();
// Set up multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter to accept only excel files
const fileFilter = (
  req: express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedFileTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ];

  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const maxSize = 10 * 1024 * 1024; // Default 10MB
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: maxSize },
});

/**
 * Process Excel file and import data into the Prisma database
 * @param {string} filePath - Path to the uploaded Excel file
 * @param {string} eventId - The ID of the event
 * @param {string} clubId - The ID of the club
 * @param {string} compeType - Competition type
 * @returns {Promise<object>} - Result of processing
 */
async function processExcelFile(
  filePath: string,
  eventId: string,
  clubId: string,
  compeType: string
) {
  try {
    // Use appropriate Excel parsing library (e.g., xlsx or exceljs)
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return { success: false, error: 'Excel file is empty or has invalid format' };
    }

    // Validate event exists
    const event = await prisma.event.findUnique({
      where: { id: parseInt(eventId) },
    });

    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    // Validate club exists
    const club = await prisma.club.findUnique({
      where: { id: parseInt(clubId) },
    });

    if (!club) {
      return { success: false, error: 'Club not found' };
    }

    // Check if registration already exists
    let eventRegistration = await prisma.eventRegistration.findFirst({
      where: {
        event_id: parseInt(eventId),
        club_id: parseInt(clubId),
      },
    });

    // Create registration if it doesn't exist
    if (!eventRegistration) {
      eventRegistration = await prisma.eventRegistration.create({
        data: {
          event_id: parseInt(eventId),
          club_id: parseInt(clubId),
          status: 'pending',
        },
      });
    }

    // Process data based on competition type
    let recordsProcessed = 0;

    // Begin transaction to ensure data consistency
    await prisma.$transaction(async (prisma) => {
      for (const row of data) {
        const memberData = prepareClubMemberData(row, compeType);

        // Check if member already exists
        let member = await prisma.clubMember.findFirst({
          where: {
            club_id: parseInt(clubId),
            name: memberData.name,
            date_of_birth: memberData.date_of_birth,
          },
        });

        // Create or update member
        if (!member) {
          member = await prisma.clubMember.create({
            data: {
              ...memberData,
              club_id: parseInt(clubId),
            },
          });
        } else {
          member = await prisma.clubMember.update({
            where: { id: member.id },
            data: memberData,
          });
        }

        // Find or create starting list
        let startingList = await prisma.startingList.findFirst({
          where: {
            event_id: parseInt(eventId),
            category: row.category || 'general',
            age_group: row.age_group,
            gender: row.gender?.toLowerCase() === 'female' ? 'female' : 'male',
          },
        });

        if (!startingList) {
          startingList = await prisma.startingList.create({
            data: {
              event_id: parseInt(eventId),
              category: row.category || 'general',
              age_group: row.age_group,
              gender: row.gender?.toLowerCase() === 'female' ? 'female' : 'male',
              status: 'scheduled',
            },
          });
        }

        // Add member to starting list
        await prisma.startingListParticipant.create({
          data: {
            starting_list_id: startingList.id,
            member_id: member.id,
            seed_time: row.seed_time ? new Date(row.seed_time) : null,
            lane_number: row.lane_number || null,
          },
        });

        recordsProcessed++;
      }
    });

    // Clean up the uploaded file
    fs.unlinkSync(filePath);

    return {
      success: true,
      message: 'Data imported successfully',
      recordsProcessed,
    };
  } catch (error) {
    console.error('Error processing Excel file:', error);
    // Clean up the uploaded file in case of error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { success: false, error };
  }
}

/**
 * Prepare club member data from Excel row
 * @param {object} row - Excel row data
 * @param {string} compeType - Competition type
 * @returns {object} - Formatted member data
 */
function prepareClubMemberData(row: ClubMember, compeType: string) {
  // Parse date of birth, handling various formats
  let dateOfBirth = null;
  if (row.date_of_birth) {
    const dobString = row.date_of_birth;
    dateOfBirth = new Date(dobString);

    // Handle invalid dates
    if (isNaN(dateOfBirth.getTime())) {
      dateOfBirth = null;
    }
  }

  // Prepare member data
  const memberData = {
    name: row.name.trim(),
    date_of_birth: dateOfBirth,
    email: row.email || null,
    phone: row.phone || null,
    emergency_contact: row.emergency_contact || null,
    category: compeType === 'achieving' ? ClubMemberTypes.achieving : ClubMemberTypes.non_achieving,
    active: true,
  };

  return memberData;
}

export const uploadExcel = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return apiError(res, 400, 'No file uploaded');
    }

    const { eventId, clubId, compeType } = req.body;

    if (!eventId || !clubId || !compeType) {
      return apiError(res, 400, 'Event ID, Club ID, and Competition type are required');
    }

    const filePath = req.file.path;

    // Process the Excel file
    const result = await processExcelFile(filePath, eventId, clubId, compeType);

    if (!result.success) {
      return apiError(res, 400, result.message!);
    }

    return apiResponse({ res, code: 200, data: result.recordsProcessed, message: result.message });
  } catch (error) {
    console.error('Error processing file:', error);
    return apiError(res, 400, error as string);
  }
};
