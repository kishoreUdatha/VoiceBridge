import ExcelJS from 'exceljs';
import { prisma } from '../config/database';
import { LeadSource, LeadPriority } from '@prisma/client';
import { BadRequestError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { rawImportService } from './rawImport.service';

interface ParsedLead {
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  notes?: string;
  // Extended fields for proper data mapping
  fatherName?: string;
  motherName?: string;
  fatherPhone?: string;
  motherPhone?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  companyName?: string; // Used for college/institution name
  customFields?: Record<string, unknown>;
}

interface BulkUploadResult {
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  invalidRows: number;
  insertedLeads: number;
  duplicates: Array<{ phone: string; email?: string; reason: string }>;
  errors: Array<{ row: number; errors: string[] }>;
}

interface LeadWithAssignment {
  organizationId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  source: LeadSource;
  priority: LeadPriority;
  notes?: string;
  // Extended fields
  fatherName?: string;
  motherName?: string;
  fatherPhone?: string;
  motherPhone?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  company?: string;
  customFields: Record<string, unknown>;
  counselorId?: string;
}

export class BulkUploadService {
  // Parse Excel/CSV file
  async parseFile(buffer: Buffer, mimetype: string): Promise<ParsedLead[]> {
    const workbook = new ExcelJS.Workbook();

    try {
      if (mimetype === 'text/csv') {
        // For CSV, parse manually since exceljs csv.read requires a stream
        const csvContent = buffer.toString('utf-8');
        const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) {
          throw new BadRequestError('File is empty or has no valid data rows');
        }

        // Parse CSV header and rows
        const headers = this.parseCSVLine(lines[0]);
        const jsonData: Record<string, unknown>[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = this.parseCSVLine(lines[i]);
          const row: Record<string, unknown> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          jsonData.push(row);
        }

        return this.mapToLeads(jsonData);
      } else {
        // Pass buffer directly - exceljs accepts Node.js Buffer
        await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
      }
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      throw new BadRequestError('Failed to parse file. Please ensure it is a valid Excel or CSV file.');
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < 2) {
      throw new BadRequestError('File is empty or has no valid data rows');
    }

    // Convert worksheet to JSON
    const jsonData: Record<string, unknown>[] = [];
    const headers: string[] = [];

    // Get headers from first row
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value || `Column${colNumber}`);
    });

    // Get data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      const rowData: Record<string, unknown> = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1] || `Column${colNumber}`;
        rowData[header] = cell.value ?? '';
      });

      // Fill in missing columns with empty string
      headers.forEach(header => {
        if (!(header in rowData)) {
          rowData[header] = '';
        }
      });

      jsonData.push(rowData);
    });

    if (jsonData.length === 0) {
      throw new BadRequestError('File is empty or has no valid data rows');
    }

    return this.mapToLeads(jsonData);
  }

  // Helper to parse CSV line handling quoted values
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  // Map raw data to lead format
  private mapToLeads(data: Record<string, unknown>[]): ParsedLead[] {
    // Separate mappings for first name only vs full name columns
    const firstNameOnlyAliases = [
      'first_name', 'firstname', 'first name', 'given name', 'given_name'
    ];
    const fullNameAliases = [
      'name', 'student name', 'student_name', 'full name', 'fullname', 'full_name',
      'candidate name', 'candidate_name', 'applicant name', 'applicant_name',
      'lead name', 'lead_name', 'customer name', 'customer_name', 'person name',
      'contact name', 'contact_name', 'naam', 'student', 'candidate', 'applicant',
      'person', 'user', 'user_name', 'username', 'stu_name', 'stuname'
    ];

    const columnMappings: Record<string, string[]> = {
      firstName: [...firstNameOnlyAliases, ...fullNameAliases],
      lastName: ['last_name', 'lastname', 'last name', 'surname', 'family name', 'family_name'],
      email: [
        'email', 'email_address', 'email address', 'e-mail', 'e_mail', 'mail',
        'email id', 'email_id', 'emailid', 'student email', 'student_email',
        'contact email', 'contact_email', 'primary email', 'primary_email'
      ],
      phone: [
        'phone', 'mobile', 'phone_number', 'phone number', 'mobile_number', 'mobile number',
        'contact', 'contact_number', 'contact number', 'cell', 'cell_number', 'cell number',
        'telephone', 'tel', 'tel_number', 'primary phone', 'primary_phone', 'primary mobile',
        'student phone', 'student_phone', 'student mobile', 'student_mobile',
        'whatsapp', 'whatsapp_number', 'whatsapp number', 'wa number', 'wa_number',
        'mobile no', 'mobile_no', 'phone no', 'phone_no', 'contact no', 'contact_no',
        'mob', 'mob_no', 'mob no', 'ph', 'ph_no', 'ph no', 'number', 'mobile1', 'phone1',
        'stu_mobileno', 'stumobileno', 'stu mobileno', 'stu_mobile', 'stumobile', 'stu mobile',
        'mobileno', 'mobile_no', 'phoneno'
      ],
      alternatePhone: [
        'alternate_phone', 'alternate phone', 'secondary phone', 'secondary_phone', 'alt_phone',
        'alternate mobile', 'alternate_mobile', 'phone2', 'mobile2', 'other phone', 'other_phone',
        'guardian phone', 'guardian_phone', 'emergency contact', 'emergency_contact'
      ],
      notes: ['notes', 'comments', 'remarks', 'description', 'note', 'comment', 'remark'],
      // Education-specific field mappings
      fatherName: [
        'fname', 'f_name', 'f name', 'father name', 'father_name', 'fathername',
        'father', 'dad name', 'dad_name', 'parent name', 'parent_name'
      ],
      motherName: [
        'mname', 'm_name', 'm name', 'mother name', 'mother_name', 'mothername',
        'mother', 'mom name', 'mom_name'
      ],
      fatherPhone: [
        'father phone', 'father_phone', 'fatherphone', 'father mobile', 'father_mobile',
        'fathermobile', 'parent phone', 'parent_phone', 'parent mobile', 'parent_mobile'
      ],
      motherPhone: [
        'mother phone', 'mother_phone', 'motherphone', 'mother mobile', 'mother_mobile',
        'mothermobile'
      ],
      gender: ['gender', 'sex', 'male/female', 'm/f'],
      dateOfBirth: [
        'dob', 'date of birth', 'date_of_birth', 'dateofbirth', 'birth date', 'birth_date',
        'birthdate', 'birthday'
      ],
      address: [
        'address', 'full address', 'full_address', 'street address', 'street_address',
        'stu_address', 'stuaddress', 'student address', 'student_address',
        'hno', 'house no', 'house_no', 'houseno', 'street', 'locality', 'area'
      ],
      city: ['city', 'town', 'village', 'stu_dist_name', 'district', 'dist'],
      state: ['state', 'province', 'region'],
      pincode: [
        'pincode', 'pin code', 'pin_code', 'zip', 'zipcode', 'zip code', 'zip_code',
        'postal code', 'postal_code', 'postalcode'
      ],
      country: ['country', 'nation'],
      companyName: [
        'collegename', 'college name', 'college_name', 'institution', 'institution name',
        'institution_name', 'school', 'school name', 'school_name', 'university',
        'university name', 'university_name', 'company', 'company name', 'company_name',
        'organization', 'org', 'org name', 'org_name'
      ],
    };

    // Fields to exclude from customFields (internal/technical codes)
    const excludeFromCustomFields = new Set([
      'college_code', 'collegecode', 'new_coll_code', 'newcollcode', 'new coll code',
      'collegedistrict', 'college district', 'college_district',
      'rollno', 'roll no', 'roll_no', 'roll number', 'roll_number',
      'admission_no', 'admissionno', 'admission no', 'admission number',
      'category', 'caste', 'religion', 'nationality', 'blood_group', 'bloodgroup',
      'aadhar', 'aadhaar', 'aadhar_no', 'aadhaar_no', 'pan', 'pan_no',
      'serial', 'sr_no', 'srno', 'sl_no', 'slno', 's_no', 'sno', 'id', 'row_id',
    ]);

    // First pass: detect column types from values if headers don't match
    const detectedColumns = this.detectColumnTypes(data);

    return data.map((row) => {
      const lead: ParsedLead = {
        firstName: '',
        phone: '',
      };

      const customFields: Record<string, unknown> = {};
      const usedKeys = new Set<string>();
      let nameSourceIsFullName = false;

      // Map standard fields by header name
      for (const [field, aliases] of Object.entries(columnMappings)) {
        for (const alias of aliases) {
          const key = Object.keys(row).find(
            (k) => k.toLowerCase().trim() === alias.toLowerCase()
          );
          if (key && row[key]) {
            (lead as unknown as Record<string, unknown>)[field] = String(row[key]).trim();
            usedKeys.add(key);
            // Track if firstName came from a full name column
            if (field === 'firstName' && fullNameAliases.includes(alias.toLowerCase())) {
              nameSourceIsFullName = true;
            }
            break;
          }
        }
      }

      // Smart detection: If phone not found by header, use detected phone column
      if (!lead.phone && detectedColumns.phoneColumn) {
        const phoneValue = row[detectedColumns.phoneColumn];
        if (phoneValue) {
          lead.phone = String(phoneValue).trim();
          usedKeys.add(detectedColumns.phoneColumn);
        }
      }

      // Smart detection: If email not found by header, use detected email column
      if (!lead.email && detectedColumns.emailColumn) {
        const emailValue = row[detectedColumns.emailColumn];
        if (emailValue) {
          lead.email = String(emailValue).trim();
          usedKeys.add(detectedColumns.emailColumn);
        }
      }

      // Smart detection: If name not found by header, use detected name column or first text column
      if (!lead.firstName && detectedColumns.nameColumn) {
        const nameValue = row[detectedColumns.nameColumn];
        if (nameValue) {
          lead.firstName = String(nameValue).trim();
          usedKeys.add(detectedColumns.nameColumn);
          nameSourceIsFullName = true; // Detected columns are usually full names
        }
      }

      // FIX: Handle duplicate name issue when full name contains lastName
      // If firstName came from a "full name" column and lastName is set,
      // check if lastName is already part of firstName (duplicate data entry)
      if (nameSourceIsFullName && lead.lastName && lead.firstName) {
        const firstNameUpper = lead.firstName.toUpperCase();
        const lastNameUpper = lead.lastName.toUpperCase();

        // Check if lastName is already contained in firstName (duplicate entry)
        if (firstNameUpper.includes(lastNameUpper) || firstNameUpper.endsWith(lastNameUpper)) {
          // Clear lastName to avoid duplication like "SHAIK SHABBEER ALI SHABBEER ALI"
          lead.lastName = undefined;
        }
      }

      // If we have a full name but no lastName, try to split intelligently
      if (nameSourceIsFullName && lead.firstName && !lead.lastName) {
        const nameParts = lead.firstName.trim().split(/\s+/);
        if (nameParts.length >= 2) {
          // Keep first part(s) as firstName, last part as lastName
          // For names like "SHAIK SHABBEER ALI", keep "SHAIK SHABBEER" as first, "ALI" as last
          lead.lastName = nameParts.pop();
          lead.firstName = nameParts.join(' ');
        }
      }

      // Collect remaining fields as custom fields (excluding technical/internal codes)
      for (const [key, value] of Object.entries(row)) {
        if (!usedKeys.has(key) && value) {
          const keyLower = key.toLowerCase().trim().replace(/[\s_-]+/g, '_');
          // Skip technical/internal fields
          if (!excludeFromCustomFields.has(keyLower) && !excludeFromCustomFields.has(key.toLowerCase().trim())) {
            customFields[key] = value;
          }
        }
      }

      if (Object.keys(customFields).length > 0) {
        lead.customFields = customFields;
      }

      return lead;
    });
  }

  // Detect column types by analyzing cell values
  private detectColumnTypes(data: Record<string, unknown>[]): {
    phoneColumn?: string;
    emailColumn?: string;
    nameColumn?: string;
  } {
    if (data.length === 0) return {};

    const sampleSize = Math.min(10, data.length);
    const sampleRows = data.slice(0, sampleSize);
    const columns = Object.keys(data[0]);

    const columnScores: Record<string, { phone: number; email: number; name: number }> = {};

    for (const col of columns) {
      columnScores[col] = { phone: 0, email: 0, name: 0 };

      for (const row of sampleRows) {
        const value = row[col];
        if (!value) continue;

        const strValue = String(value).trim();

        // Check if value looks like a phone number
        const normalizedPhone = strValue.replace(/[\s\-\(\)\.]/g, '');
        if (/^\+?\d{7,15}$/.test(normalizedPhone)) {
          columnScores[col].phone++;
        }

        // Check if value looks like an email
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue)) {
          columnScores[col].email++;
        }

        // Check if value looks like a name (alphabetic with spaces, 2-50 chars)
        if (/^[a-zA-Z\s\.]{2,50}$/.test(strValue) && !strValue.includes('@')) {
          columnScores[col].name++;
        }
      }
    }

    // Find best matching columns (>50% of samples should match)
    const threshold = sampleSize * 0.5;
    let phoneColumn: string | undefined;
    let emailColumn: string | undefined;
    let nameColumn: string | undefined;

    let maxPhoneScore = 0;
    let maxEmailScore = 0;
    let maxNameScore = 0;

    for (const [col, scores] of Object.entries(columnScores)) {
      if (scores.phone > threshold && scores.phone > maxPhoneScore) {
        maxPhoneScore = scores.phone;
        phoneColumn = col;
      }
      if (scores.email > threshold && scores.email > maxEmailScore) {
        maxEmailScore = scores.email;
        emailColumn = col;
      }
      if (scores.name > threshold && scores.name > maxNameScore) {
        maxNameScore = scores.name;
        nameColumn = col;
      }
    }

    return { phoneColumn, emailColumn, nameColumn };
  }

  // Validate leads
  validateLeads(leads: ParsedLead[]): {
    valid: ParsedLead[];
    invalid: Array<{ row: number; errors: string[] }>;
  } {
    const valid: ParsedLead[] = [];
    const invalid: Array<{ row: number; errors: string[] }> = [];

    leads.forEach((lead, index) => {
      const errors: string[] = [];

      if (!lead.firstName || lead.firstName.trim() === '') {
        errors.push('First name is required');
      }

      if (!lead.phone || lead.phone.trim() === '') {
        errors.push('Phone number is required');
      } else {
        // Normalize phone number (remove spaces, dashes, etc.)
        lead.phone = this.normalizePhone(lead.phone);
        if (!this.isValidPhone(lead.phone)) {
          errors.push('Invalid phone number format');
        }
      }

      if (lead.email && !this.isValidEmail(lead.email)) {
        errors.push('Invalid email format');
      }

      if (errors.length > 0) {
        invalid.push({ row: index + 2, errors }); // +2 for header row and 0-index
      } else {
        valid.push(lead);
      }
    });

    return { valid, invalid };
  }

  // Check for duplicates against existing database records
  async detectDuplicates(
    organizationId: string,
    leads: ParsedLead[]
  ): Promise<{
    unique: ParsedLead[];
    duplicates: Array<{ phone: string; email?: string; reason: string }>;
  }> {
    const phones = leads.map((l) => l.phone);
    const emails = leads.filter((l) => l.email).map((l) => l.email!.toLowerCase());

    // Batch size to avoid PostgreSQL bind variable limit (max 32767)
    const BATCH_SIZE = 10000;
    const existingPhones = new Set<string>();
    const existingEmails = new Set<string>();

    // Query phones in batches
    for (let i = 0; i < phones.length; i += BATCH_SIZE) {
      const phoneBatch = phones.slice(i, i + BATCH_SIZE);
      const results = await prisma.lead.findMany({
        where: {
          organizationId,
          phone: { in: phoneBatch },
        },
        select: { phone: true },
      });
      results.forEach((l) => existingPhones.add(l.phone));
    }

    // Query emails in batches
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const emailBatch = emails.slice(i, i + BATCH_SIZE);
      const results = await prisma.lead.findMany({
        where: {
          organizationId,
          email: { in: emailBatch, mode: 'insensitive' },
        },
        select: { email: true },
      });
      results.forEach((l) => {
        if (l.email) existingEmails.add(l.email.toLowerCase());
      });
    }

    const unique: ParsedLead[] = [];
    const duplicates: Array<{ phone: string; email?: string; reason: string }> = [];
    const seenPhones = new Set<string>();
    const seenEmails = new Set<string>();

    for (const lead of leads) {
      let isDuplicate = false;
      let reason = '';

      // Check against database
      if (existingPhones.has(lead.phone)) {
        isDuplicate = true;
        reason = 'Phone number already exists in database';
      } else if (lead.email && existingEmails.has(lead.email.toLowerCase())) {
        isDuplicate = true;
        reason = 'Email already exists in database';
      }
      // Check against current batch (internal duplicates)
      else if (seenPhones.has(lead.phone)) {
        isDuplicate = true;
        reason = 'Duplicate phone number in uploaded file';
      } else if (lead.email && seenEmails.has(lead.email.toLowerCase())) {
        isDuplicate = true;
        reason = 'Duplicate email in uploaded file';
      }

      if (isDuplicate) {
        duplicates.push({ phone: lead.phone, email: lead.email, reason });
      } else {
        unique.push(lead);
        seenPhones.add(lead.phone);
        if (lead.email) {
          seenEmails.add(lead.email.toLowerCase());
        }
      }
    }

    return { unique, duplicates };
  }

  // Round-robin lead distribution
  async distributLeads(
    organizationId: string,
    leads: ParsedLead[],
    counselorIds?: string[]
  ): Promise<LeadWithAssignment[]> {
    // Get counselors if not provided
    let counselors: { id: string; activeLeadCount: number }[];

    if (counselorIds && counselorIds.length > 0) {
      // Use provided counselor IDs
      const users = await prisma.user.findMany({
        where: {
          id: { in: counselorIds },
          organizationId,
          isActive: true,
        },
        select: {
          id: true,
          _count: {
            select: {
              leadAssignments: { where: { isActive: true } },
            },
          },
        },
      });

      counselors = users.map((u) => ({
        id: u.id,
        activeLeadCount: u._count.leadAssignments,
      }));
    } else {
      // Get all active counselors
      const users = await prisma.user.findMany({
        where: {
          organizationId,
          role: { slug: 'counselor' },
          isActive: true,
        },
        select: {
          id: true,
          _count: {
            select: {
              leadAssignments: { where: { isActive: true } },
            },
          },
        },
      });

      counselors = users.map((u) => ({
        id: u.id,
        activeLeadCount: u._count.leadAssignments,
      }));
    }

    if (counselors.length === 0) {
      // No counselors available, return leads without assignment
      return leads.map((lead) => ({
        organizationId,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        alternatePhone: lead.alternatePhone,
        source: LeadSource.BULK_UPLOAD,
        priority: LeadPriority.MEDIUM,
        notes: lead.notes,
        // Extended fields
        fatherName: lead.fatherName,
        motherName: lead.motherName,
        fatherPhone: lead.fatherPhone,
        motherPhone: lead.motherPhone,
        gender: lead.gender,
        dateOfBirth: lead.dateOfBirth,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        pincode: lead.pincode,
        country: lead.country,
        companyName: lead.companyName,
        customFields: lead.customFields || {},
      }));
    }

    // Sort by workload (ascending)
    counselors.sort((a, b) => a.activeLeadCount - b.activeLeadCount);

    // Distribute leads using round-robin
    return leads.map((lead, index) => {
      const counselorIndex = index % counselors.length;
      return {
        organizationId,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        alternatePhone: lead.alternatePhone,
        source: LeadSource.BULK_UPLOAD,
        priority: LeadPriority.MEDIUM,
        notes: lead.notes,
        // Extended fields
        fatherName: lead.fatherName,
        motherName: lead.motherName,
        fatherPhone: lead.fatherPhone,
        motherPhone: lead.motherPhone,
        gender: lead.gender,
        dateOfBirth: lead.dateOfBirth,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        pincode: lead.pincode,
        country: lead.country,
        companyName: lead.companyName,
        customFields: lead.customFields || {},
        counselorId: counselors[counselorIndex].id,
      };
    });
  }

  // Bulk insert leads with assignments - OPTIMIZED with createMany
  async bulkInsert(
    leads: LeadWithAssignment[],
    assignedById?: string
  ): Promise<number> {
    const BATCH_SIZE = 5000; // Larger batches are fine with createMany
    let insertedCount = 0;

    // Process in batches
    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      const batch = leads.slice(i, i + BATCH_SIZE);

      // Pre-generate UUIDs for leads so we can create assignments
      const leadsWithIds = batch.map((leadData) => {
        const { counselorId, ...leadFields } = leadData;
        return {
          id: uuidv4(),
          counselorId,
          leadFields,
        };
      });

      // Prepare lead data for createMany
      const leadRecords = leadsWithIds.map((item) => ({
        id: item.id,
        ...item.leadFields,
      }));

      // Prepare assignment data for createMany
      const assignmentRecords = leadsWithIds
        .filter((item) => item.counselorId)
        .map((item) => ({
          id: uuidv4(),
          leadId: item.id,
          assignedToId: item.counselorId!,
          assignedById,
          isActive: true,
        }));

      // Use transaction to insert both leads and assignments
      await prisma.$transaction(async (tx) => {
        // Bulk insert leads
        await tx.lead.createMany({
          data: leadRecords as any,
          skipDuplicates: true,
        });

        // Bulk insert assignments if any
        if (assignmentRecords.length > 0) {
          await tx.leadAssignment.createMany({
            data: assignmentRecords as any,
            skipDuplicates: true,
          });
        }
      }, {
        timeout: 300000, // 5 minute timeout per batch
      });

      insertedCount += batch.length;
      console.log(`[BulkUpload] Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} leads (Total: ${insertedCount}/${leads.length})`);
    }

    return insertedCount;
  }

  // Main bulk upload process
  async processUpload(
    organizationId: string,
    buffer: Buffer,
    mimetype: string,
    counselorIds?: string[],
    assignedById?: string
  ): Promise<BulkUploadResult> {
    // 1. Parse file
    const parsedLeads = await this.parseFile(buffer, mimetype);

    // 2. Validate leads
    const { valid, invalid } = this.validateLeads(parsedLeads);

    // 3. Detect duplicates
    const { unique, duplicates } = await this.detectDuplicates(organizationId, valid);

    // 4. Distribute leads
    const leadsWithAssignments = await this.distributLeads(
      organizationId,
      unique,
      counselorIds
    );

    // 5. Bulk insert
    const insertedCount = await this.bulkInsert(leadsWithAssignments, assignedById);

    return {
      totalRows: parsedLeads.length,
      validRows: valid.length,
      duplicateRows: duplicates.length,
      invalidRows: invalid.length,
      insertedLeads: insertedCount,
      duplicates,
      errors: invalid,
    };
  }

  // Helper functions
  private normalizePhone(phone: string): string {
    return phone.replace(/[\s\-\(\)\.]/g, '');
  }

  private isValidPhone(phone: string): boolean {
    // Allow numbers with optional + prefix, 7-15 digits
    return /^\+?\d{7,15}$/.test(phone);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Process upload to Raw Import Records (new flow)
  async processUploadToRaw(
    organizationId: string,
    uploadedById: string,
    buffer: Buffer,
    mimetype: string,
    fileName: string,
    fileSize: number
  ): Promise<{
    bulkImportId: string;
    totalRows: number;
    validRows: number;
    duplicateRows: number;
    invalidRows: number;
    insertedRecords: number;
  }> {
    // 1. Parse file
    const parsedRecords = await this.parseFile(buffer, mimetype);
    console.log(`[BulkUpload] Parsed ${parsedRecords.length} records from file`);
    if (parsedRecords.length > 0) {
      console.log(`[BulkUpload] Sample parsed record:`, JSON.stringify(parsedRecords[0]));
    }

    // 2. Validate records
    const { valid, invalid } = this.validateLeads(parsedRecords);
    console.log(`[BulkUpload] Validation: ${valid.length} valid, ${invalid.length} invalid`);
    if (invalid.length > 0 && invalid.length <= 5) {
      console.log(`[BulkUpload] Invalid records:`, JSON.stringify(invalid));
    } else if (invalid.length > 5) {
      console.log(`[BulkUpload] First 5 invalid records:`, JSON.stringify(invalid.slice(0, 5)));
    }

    // 3. Detect duplicates at tenant level (check against both leads AND raw_import_records)
    const recordsForDuplicateCheck = valid.map((r) => ({
      phone: r.phone,
      email: r.email,
    }));
    const { unique, duplicates } = await rawImportService.detectDuplicates(
      organizationId,
      recordsForDuplicateCheck,
      { skipRawImportCheck: false } // Check against all existing records in the organization
    );
    console.log(`[BulkUpload] Duplicate detection: ${unique.length} unique, ${duplicates.length} duplicates`);

    // Filter valid records to only unique ones
    const uniquePhones = new Set(unique.map((u) => u.phone));
    const uniqueRecords = valid.filter((r) => uniquePhones.has(r.phone));

    // 4. Create BulkImport record
    const bulkImport = await rawImportService.createBulkImport({
      organizationId,
      uploadedById,
      fileName,
      fileSize,
      mimeType: mimetype,
      totalRows: parsedRecords.length,
      validRows: valid.length,
      invalidRows: invalid.length,
      duplicateRows: duplicates.length,
    });

    // 5. Insert into RawImportRecord (NOT leads)
    const insertedCount = await rawImportService.createRecords(
      bulkImport.id,
      organizationId,
      uniqueRecords.map((record) => ({
        firstName: record.firstName,
        lastName: record.lastName,
        email: record.email,
        phone: record.phone,
        alternatePhone: record.alternatePhone,
        customFields: record.customFields,
      }))
    );

    console.log(`[BulkUpload] Created raw import ${bulkImport.id} with ${insertedCount} records`);

    return {
      bulkImportId: bulkImport.id,
      totalRows: parsedRecords.length,
      validRows: valid.length,
      duplicateRows: duplicates.length,
      invalidRows: invalid.length,
      insertedRecords: insertedCount,
    };
  }
}

export const bulkUploadService = new BulkUploadService();
