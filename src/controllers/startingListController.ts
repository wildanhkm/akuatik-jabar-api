import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();

/**
 * Get all starting lists for a specific event
 */
export const getAllStartingLists = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    // Validate event exists
    const event = await prisma.event.findUnique({
      where: { id: Number(eventId) },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const startingLists = await prisma.startingList.findMany({
      where: { event_id: Number(eventId) },
      include: {
        participants: {
          include: {
            member: true,
          },
        },
      },
    });

    return res.status(200).json(startingLists);
  } catch (error) {
    console.error('Error fetching starting lists:', error);
    return res.status(500).json({ error: 'Failed to retrieve starting lists' });
  }
};

/**
 * Get a specific starting list by ID for an event
 */
export const getStartingListById = async (req: Request, res: Response) => {
  try {
    const { eventId, id } = req.params;

    const startingList = await prisma.startingList.findFirst({
      where: {
        id: Number(id),
        event_id: Number(eventId),
      },
      include: {
        participants: {
          include: {
            member: true,
          },
        },
        event: true,
      },
    });

    if (!startingList) {
      return res.status(404).json({ error: 'Starting list not found' });
    }

    return res.status(200).json(startingList);
  } catch (error) {
    console.error('Error fetching starting list:', error);
    return res.status(500).json({ error: 'Failed to retrieve starting list' });
  }
};

/**
 * Create a new starting list for an event
 */
export const createStartingList = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { eventId } = req.params;
    const { category, age_group, gender, max_participants, start_time } = req.body;

    // Validate event exists
    const event = await prisma.event.findUnique({
      where: { id: Number(eventId) },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const newStartingList = await prisma.startingList.create({
      data: {
        event: {
          connect: { id: Number(eventId) },
        },
        category,
        age_group,
        gender,
        max_participants,
        start_time: start_time ? new Date(start_time) : null,
        status: 'scheduled',
      },
    });

    return res.status(201).json(newStartingList);
  } catch (error) {
    console.error('Error creating starting list:', error);
    return res.status(500).json({ error: 'Failed to create starting list' });
  }
};

/**
 * Update a starting list
 */
export const updateStartingList = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { eventId, id } = req.params;
    const { category, age_group, gender, max_participants, start_time, status } = req.body;

    // Check if the starting list exists
    const existingStartingList = await prisma.startingList.findFirst({
      where: {
        id: Number(id),
        event_id: Number(eventId),
      },
    });

    if (!existingStartingList) {
      return res.status(404).json({ error: 'Starting list not found' });
    }

    // Update the starting list
    const updatedStartingList = await prisma.startingList.update({
      where: { id: Number(id) },
      data: {
        category,
        age_group,
        gender,
        max_participants,
        start_time: start_time ? new Date(start_time) : existingStartingList.start_time,
        status: status || existingStartingList.status,
        updated_at: new Date(),
      },
    });

    return res.status(200).json(updatedStartingList);
  } catch (error) {
    console.error('Error updating starting list:', error);
    return res.status(500).json({ error: 'Failed to update starting list' });
  }
};

/**
 * Delete a starting list
 */
export const deleteStartingList = async (req: Request, res: Response) => {
  try {
    const { eventId, id } = req.params;

    // Check if the starting list exists
    const existingStartingList = await prisma.startingList.findFirst({
      where: {
        id: Number(id),
        event_id: Number(eventId),
      },
    });

    if (!existingStartingList) {
      return res.status(404).json({ error: 'Starting list not found' });
    }

    // Check if there are any invoice items linked to this starting list
    const linkedInvoiceItems = await prisma.invoiceItem.findFirst({
      where: { starting_list_id: Number(id) },
    });

    if (linkedInvoiceItems) {
      return res.status(400).json({
        error: 'Cannot delete starting list as it has linked invoice items',
      });
    }

    // Delete participants first to avoid foreign key constraints
    await prisma.startingListParticipant.deleteMany({
      where: { starting_list_id: Number(id) },
    });

    // Delete the starting list
    await prisma.startingList.delete({
      where: { id: Number(id) },
    });

    return res.status(200).json({ message: 'Starting list deleted successfully' });
  } catch (error) {
    console.error('Error deleting starting list:', error);
    return res.status(500).json({ error: 'Failed to delete starting list' });
  }
};

/**
 * Add participant to starting list
 */
export const addParticipantToStartingList = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { eventId, id } = req.params;
    const { member_id, lane_number, seed_time } = req.body;

    // Check if the starting list exists
    const startingList = await prisma.startingList.findFirst({
      where: {
        id: Number(id),
        event_id: Number(eventId),
      },
      include: {
        participants: true,
      },
    });

    if (!startingList) {
      return res.status(404).json({ error: 'Starting list not found' });
    }

    // Check if max participants limit is reached
    if (
      startingList.max_participants &&
      startingList.participants.length >= startingList.max_participants
    ) {
      return res.status(400).json({
        error: `Maximum number of participants (${startingList.max_participants}) already reached`,
      });
    }

    // Check if member exists
    const member = await prisma.clubMember.findUnique({
      where: { id: Number(member_id) },
    });

    if (!member) {
      return res.status(404).json({ error: 'Club member not found' });
    }

    // Check if member is already in this starting list
    const existingParticipant = await prisma.startingListParticipant.findFirst({
      where: {
        starting_list_id: Number(id),
        member_id: Number(member_id),
      },
    });

    if (existingParticipant) {
      return res.status(400).json({ error: 'Member is already in this starting list' });
    }

    // Add participant to starting list
    const newParticipant = await prisma.startingListParticipant.create({
      data: {
        starting_list: {
          connect: { id: Number(id) },
        },
        member: {
          connect: { id: Number(member_id) },
        },
        lane_number: lane_number ? Number(lane_number) : null,
        seed_time: seed_time ? new Date(seed_time) : null,
      },
      include: {
        member: true,
      },
    });

    return res.status(201).json(newParticipant);
  } catch (error) {
    console.error('Error adding participant to starting list:', error);
    return res.status(500).json({ error: 'Failed to add participant to starting list' });
  }
};

/**
 * Remove participant from starting list
 */
export const removeParticipantFromStartingList = async (req: Request, res: Response) => {
  try {
    const { eventId, id } = req.params;
    const { participantId } = req.body;

    // Check if the participant exists in this starting list
    const participant = await prisma.startingListParticipant.findFirst({
      where: {
        id: Number(participantId),
        starting_list_id: Number(id),
      },
    });

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found in this starting list' });
    }

    // Check if there are any invoice items linked to this participant
    const linkedInvoiceItem = await prisma.invoiceItem.findFirst({
      where: {
        starting_list_id: Number(id),
        member_id: participant.member_id,
      },
    });

    if (linkedInvoiceItem) {
      return res.status(400).json({
        error: 'Cannot remove participant as they have linked invoice items',
      });
    }

    // Remove participant
    await prisma.startingListParticipant.delete({
      where: { id: participant.id },
    });

    return res.status(200).json({ message: 'Participant removed successfully' });
  } catch (error) {
    console.error('Error removing participant from starting list:', error);
    return res.status(500).json({ error: 'Failed to remove participant from starting list' });
  }
};

/**
 * Update participant results
 */
export const updateParticipantResults = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { eventId, id } = req.params;
    const { participantId, final_time, position } = req.body;

    // Check if the participant exists in this starting list
    const participant = await prisma.startingListParticipant.findFirst({
      where: {
        id: Number(participantId),
        starting_list_id: Number(id),
      },
    });

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found in this starting list' });
    }

    // Update participant results
    const updatedParticipant = await prisma.startingListParticipant.update({
      where: { id: Number(participantId) },
      data: {
        final_time: final_time ? new Date(final_time) : participant.final_time,
        position: position !== undefined ? Number(position) : participant.position,
        updated_at: new Date(),
      },
      include: {
        member: true,
      },
    });

    return res.status(200).json(updatedParticipant);
  } catch (error) {
    console.error('Error updating participant results:', error);
    return res.status(500).json({ error: 'Failed to update participant results' });
  }
};

/**
 * Update starting list status
 */
export const updateStartingListStatus = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { eventId, id } = req.params;
    const { status } = req.body;

    // Check if the starting list exists
    const startingList = await prisma.startingList.findFirst({
      where: {
        id: Number(id),
        event_id: Number(eventId),
      },
    });

    if (!startingList) {
      return res.status(404).json({ error: 'Starting list not found' });
    }

    // Validate the status value
    const validStatusValues = ['scheduled', 'in_progress', 'completed'];
    if (!validStatusValues.includes(status)) {
      return res.status(400).json({
        error: `Invalid status value. Must be one of: ${validStatusValues.join(', ')}`,
      });
    }

    // Update the status
    const updatedStartingList = await prisma.startingList.update({
      where: { id: Number(id) },
      data: {
        status,
        updated_at: new Date(),
      },
    });

    return res.status(200).json(updatedStartingList);
  } catch (error) {
    console.error('Error updating starting list status:', error);
    return res.status(500).json({ error: 'Failed to update starting list status' });
  }
};
