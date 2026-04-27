/**
 * Seed Industries Script
 * Populates the dynamic_industries table from config files
 * Run with: npx ts-node src/scripts/seed-industries.ts
 */

import { prisma } from '../config/database';
import { INDUSTRY_FIELD_CONFIGS, IndustryField } from '../config/industry-fields.config';
import { LEAD_STAGE_TEMPLATES } from '../config/lead-stage-templates.config';
import { OrganizationIndustry, Prisma } from '@prisma/client';

/**
 * Convert industry key to slug format
 * e.g., "REAL_ESTATE" -> "real-estate"
 */
function toSlug(key: string): string {
  return key.toLowerCase().replace(/_/g, '-');
}

/**
 * Map config field type to database field type
 */
function mapFieldType(type: string): string {
  const typeMap: Record<string, string> = {
    'text': 'text',
    'number': 'number',
    'select': 'select',
    'multiselect': 'multiselect',
    'date': 'date',
    'boolean': 'boolean',
    'currency': 'currency',
    'textarea': 'textarea',
  };
  return typeMap[type] || 'text';
}

async function seedIndustries() {
  console.log('Starting industry seed...\n');

  const industries = Object.keys(INDUSTRY_FIELD_CONFIGS) as OrganizationIndustry[];
  let created = 0;
  let updated = 0;
  let fieldTemplatesCreated = 0;
  let stageTemplatesCreated = 0;

  for (const industryKey of industries) {
    const slug = toSlug(industryKey);
    const fieldConfig = INDUSTRY_FIELD_CONFIGS[industryKey];
    const stageConfig = LEAD_STAGE_TEMPLATES[industryKey];

    console.log(`Processing ${industryKey} (${slug})...`);

    try {
      // Upsert the industry
      const existingIndustry = await prisma.dynamicIndustry.findUnique({
        where: { slug },
      });

      const industryData = {
        slug,
        name: fieldConfig.label,
        description: `${fieldConfig.label} industry configuration`,
        icon: fieldConfig.icon,
        color: fieldConfig.color,
        isSystem: true,
        isActive: true,
        defaultLabels: {},
        version: 1,
      };

      let industry;
      if (existingIndustry) {
        // Update existing industry (but don't overwrite custom changes)
        industry = await prisma.dynamicIndustry.update({
          where: { slug },
          data: {
            // Only update if it's a system industry
            ...(existingIndustry.isSystem ? {
              name: industryData.name,
              icon: industryData.icon,
              color: industryData.color,
            } : {}),
          },
        });
        updated++;
        console.log(`  Updated industry: ${slug}`);
      } else {
        industry = await prisma.dynamicIndustry.create({
          data: industryData,
        });
        created++;
        console.log(`  Created industry: ${slug}`);
      }

      // Seed field templates
      if (fieldConfig.fields && fieldConfig.fields.length > 0) {
        for (let i = 0; i < fieldConfig.fields.length; i++) {
          const field = fieldConfig.fields[i];

          // Upsert field template
          const existingField = await prisma.dynamicIndustryFieldTemplate.findFirst({
            where: {
              industryId: industry.id,
              key: field.key,
            },
          });

          if (existingField) {
            await prisma.dynamicIndustryFieldTemplate.update({
              where: { id: existingField.id },
              data: {
                label: field.label,
                fieldType: mapFieldType(field.type),
                isRequired: field.required || false,
                placeholder: field.placeholder || null,
                helpText: field.helpText || null,
                options: field.options ? (field.options as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
                minValue: field.min || null,
                maxValue: field.max || null,
                unit: field.unit || null,
                groupName: null,
                displayOrder: i,
                gridSpan: field.gridSpan || 1,
              },
            });
          } else {
            await prisma.dynamicIndustryFieldTemplate.create({
              data: {
                industryId: industry.id,
                key: field.key,
                label: field.label,
                fieldType: mapFieldType(field.type),
                isRequired: field.required || false,
                placeholder: field.placeholder || null,
                helpText: field.helpText || null,
                options: field.options ? (field.options as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
                minValue: field.min || null,
                maxValue: field.max || null,
                unit: field.unit || null,
                groupName: null,
                displayOrder: i,
                gridSpan: field.gridSpan || 1,
              },
            });
            fieldTemplatesCreated++;
          }
        }
        console.log(`  Processed ${fieldConfig.fields.length} field templates`);
      }

      // Seed stage templates
      if (stageConfig) {
        // Process regular stages
        for (const stage of stageConfig.stages) {
          const existingStage = await prisma.dynamicIndustryStageTemplate.findFirst({
            where: {
              industryId: industry.id,
              slug: stage.slug,
            },
          });

          if (existingStage) {
            await prisma.dynamicIndustryStageTemplate.update({
              where: { id: existingStage.id },
              data: {
                name: stage.name,
                color: stage.color,
                icon: stage.icon,
                journeyOrder: stage.journeyOrder,
                isDefault: stage.isDefault || false,
                isLostStage: false,
                autoSyncStatus: stage.autoSyncStatus || null,
              },
            });
          } else {
            await prisma.dynamicIndustryStageTemplate.create({
              data: {
                industryId: industry.id,
                name: stage.name,
                slug: stage.slug,
                color: stage.color,
                icon: stage.icon,
                journeyOrder: stage.journeyOrder,
                isDefault: stage.isDefault || false,
                isLostStage: false,
                autoSyncStatus: stage.autoSyncStatus || null,
              },
            });
            stageTemplatesCreated++;
          }
        }

        // Process lost stage
        if (stageConfig.lostStage) {
          const existingLostStage = await prisma.dynamicIndustryStageTemplate.findFirst({
            where: {
              industryId: industry.id,
              slug: stageConfig.lostStage.slug,
            },
          });

          if (existingLostStage) {
            await prisma.dynamicIndustryStageTemplate.update({
              where: { id: existingLostStage.id },
              data: {
                name: stageConfig.lostStage.name,
                color: stageConfig.lostStage.color,
                icon: stageConfig.lostStage.icon,
                journeyOrder: stageConfig.lostStage.journeyOrder,
                isDefault: false,
                isLostStage: true,
                autoSyncStatus: stageConfig.lostStage.autoSyncStatus || 'LOST',
              },
            });
          } else {
            await prisma.dynamicIndustryStageTemplate.create({
              data: {
                industryId: industry.id,
                name: stageConfig.lostStage.name,
                slug: stageConfig.lostStage.slug,
                color: stageConfig.lostStage.color,
                icon: stageConfig.lostStage.icon,
                journeyOrder: stageConfig.lostStage.journeyOrder,
                isDefault: false,
                isLostStage: true,
                autoSyncStatus: stageConfig.lostStage.autoSyncStatus || 'LOST',
              },
            });
            stageTemplatesCreated++;
          }
        }

        console.log(`  Processed ${stageConfig.stages.length + 1} stage templates`);
      }

    } catch (error) {
      console.error(`  Error processing ${industryKey}:`, error);
    }
  }

  console.log('\n============================================');
  console.log('      SEED SUMMARY');
  console.log('============================================');
  console.log(`  Industries created: ${created}`);
  console.log(`  Industries updated: ${updated}`);
  console.log(`  Field templates created: ${fieldTemplatesCreated}`);
  console.log(`  Stage templates created: ${stageTemplatesCreated}`);
  console.log('============================================\n');

  // Show final counts
  const totalIndustries = await prisma.dynamicIndustry.count();
  const totalFields = await prisma.dynamicIndustryFieldTemplate.count();
  const totalStages = await prisma.dynamicIndustryStageTemplate.count();

  console.log('Final database counts:');
  console.log(`  Total industries: ${totalIndustries}`);
  console.log(`  Total field templates: ${totalFields}`);
  console.log(`  Total stage templates: ${totalStages}`);
}

// Main execution
seedIndustries()
  .then(() => {
    console.log('\nSeed completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nSeed failed:', error);
    process.exit(1);
  });
