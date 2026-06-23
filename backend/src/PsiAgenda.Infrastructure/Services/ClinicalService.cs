using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PsiAgenda.Application.Clinical;
using PsiAgenda.Domain.Entities;
using PsiAgenda.Domain.Enums;
using PsiAgenda.Infrastructure.Persistence;

namespace PsiAgenda.Infrastructure.Services;

public sealed class ClinicalService(PsiAgendaDbContext dbContext) : IClinicalService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly HashSet<string> AllowedTagTones = new(StringComparer.OrdinalIgnoreCase)
    {
        "neutral",
        "attention",
        "risk"
    };
    private static readonly HashSet<string> AllowedRecordTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "session_evolution",
        "initial_assessment",
        "follow_up",
        "rectification",
        "other"
    };
    private static readonly IReadOnlyList<string> ConsentTypes =
    [
        "portal",
        "checkins",
        "materials",
        "notifications",
        "ai_analysis",
        "recording",
        "transcription"
    ];
    private static readonly HashSet<string> AllowedConsentTypes = new(ConsentTypes, StringComparer.OrdinalIgnoreCase);
    private static readonly HashSet<string> AllowedConsentStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "pending",
        "granted",
        "revoked",
        "expired"
    };
    private static readonly HashSet<string> AllowedTreatmentPlanStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "active",
        "paused",
        "completed",
        "archived"
    };
    private static readonly HashSet<string> AllowedShareableStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "private",
        "shared",
        "completed",
        "archived"
    };
    private static readonly HashSet<string> AllowedMaterialTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "text",
        "link"
    };

    public async Task<ClinicalWorkspaceDto> GetAppointmentWorkspaceAsync(
        Guid professionalUserId,
        Guid appointmentId,
        CancellationToken cancellationToken)
    {
        var appointment = await EnsureProfessionalAppointmentAsync(professionalUserId, appointmentId, cancellationToken);
        var session = await EnsureClinicalSessionAsync(appointment, professionalUserId, cancellationToken);

        var drafts = await dbContext.ClinicalDrafts
            .AsNoTracking()
            .Where(draft => draft.AppointmentId == appointment.Id)
            .OrderByDescending(draft => draft.CreatedAt)
            .Take(20)
            .ToListAsync(cancellationToken);
        var tags = await dbContext.AppliedClinicalTags
            .AsNoTracking()
            .Where(tag => tag.AppointmentId == appointment.Id)
            .OrderBy(tag => tag.Label)
            .ToListAsync(cancellationToken);
        var records = await dbContext.ClinicalRecords
            .AsNoTracking()
            .Where(record => record.AppointmentId == appointment.Id)
            .OrderByDescending(record => record.ApprovedAt)
            .Take(20)
            .ToListAsync(cancellationToken);
        var consents = await GetPatientConsentsAsync(appointment, cancellationToken);
        var treatmentPlan = await GetTreatmentPlanAsync(appointment, cancellationToken);
        var tasks = await dbContext.PatientTasks
            .AsNoTracking()
            .Where(task =>
                task.PatientId == appointment.CustomerId &&
                task.ProfessionalId == appointment.ProfessionalId)
            .OrderByDescending(task => task.CreatedAt)
            .Take(20)
            .ToListAsync(cancellationToken);
        var materials = await dbContext.SharedMaterials
            .AsNoTracking()
            .Where(material =>
                material.PatientId == appointment.CustomerId &&
                material.ProfessionalId == appointment.ProfessionalId)
            .OrderByDescending(material => material.CreatedAt)
            .Take(20)
            .ToListAsync(cancellationToken);
        var timeline = await dbContext.PatientTimelineItems
            .AsNoTracking()
            .Where(item =>
                item.PatientId == appointment.CustomerId &&
                item.ProfessionalId == appointment.ProfessionalId)
            .OrderByDescending(item => item.OccurredAt)
            .Take(40)
            .ToListAsync(cancellationToken);

        await AddClinicalAuditAsync(
            professionalUserId,
            appointment.SpaceId,
            "clinical.workspace.viewed",
            "Appointment",
            appointment.Id,
            cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new ClinicalWorkspaceDto(
            appointment.Id,
            appointment.CustomerId,
            appointment.ProfessionalId,
            appointment.SpaceId,
            ToDto(session),
            drafts.Select(ToDto).ToList(),
            records.Select(ToDto).ToList(),
            tags.Select(ToDto).ToList(),
            consents,
            treatmentPlan,
            tasks.Select(ToDto).ToList(),
            materials.Select(ToDto).ToList(),
            timeline.Select(ToDto).ToList());
    }

    public async Task<PatientCarePortalDto> GetPatientCarePortalAsync(
        Guid patientUserId,
        CancellationToken cancellationToken)
    {
        await EnsurePatientUserAsync(patientUserId, cancellationToken);
        var now = DateTimeOffset.UtcNow;

        var tasks = await dbContext.PatientTasks
            .AsNoTracking()
            .Where(task =>
                task.PatientId == patientUserId &&
                task.Status == "shared" &&
                dbContext.PatientConsents.Any(consent =>
                    consent.PatientId == task.PatientId &&
                    consent.ProfessionalId == task.ProfessionalId &&
                    consent.ConsentType == "portal" &&
                    consent.Status == "granted" &&
                    (consent.ExpiresAt == null || consent.ExpiresAt > now)))
            .OrderBy(task => task.DueAt == null)
            .ThenBy(task => task.DueAt)
            .ThenByDescending(task => task.CreatedAt)
            .Take(50)
            .ToListAsync(cancellationToken);

        var materials = await dbContext.SharedMaterials
            .AsNoTracking()
            .Where(material =>
                material.PatientId == patientUserId &&
                material.Status == "shared" &&
                dbContext.PatientConsents.Any(consent =>
                    consent.PatientId == material.PatientId &&
                    consent.ProfessionalId == material.ProfessionalId &&
                    consent.ConsentType == "portal" &&
                    consent.Status == "granted" &&
                    (consent.ExpiresAt == null || consent.ExpiresAt > now)) &&
                dbContext.PatientConsents.Any(consent =>
                    consent.PatientId == material.PatientId &&
                    consent.ProfessionalId == material.ProfessionalId &&
                    consent.ConsentType == "materials" &&
                    consent.Status == "granted" &&
                    (consent.ExpiresAt == null || consent.ExpiresAt > now)))
            .OrderByDescending(material => material.SharedAt ?? material.CreatedAt)
            .Take(50)
            .ToListAsync(cancellationToken);

        var auditedSpaceIds = tasks
            .Select(task => task.SpaceId)
            .Concat(materials.Select(material => material.SpaceId))
            .Distinct()
            .ToList();

        foreach (var spaceId in auditedSpaceIds)
        {
            await AddClinicalAuditAsync(
                patientUserId,
                spaceId,
                "patient.portal.viewed",
                "Patient",
                patientUserId,
                cancellationToken);
        }

        if (auditedSpaceIds.Count > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return new PatientCarePortalDto(
            patientUserId,
            tasks.Select(ToDto).ToList(),
            materials.Select(ToDto).ToList());
    }

    public async Task<ClinicalDraftDto> CreateAppointmentDraftAsync(
        Guid professionalUserId,
        Guid appointmentId,
        CreateClinicalDraftRequest request,
        CancellationToken cancellationToken)
    {
        var appointment = await EnsureProfessionalAppointmentAsync(professionalUserId, appointmentId, cancellationToken);
        var contentText = ValidateText(request.ContentText, "Rascunho", 3, 8000);
        var sessionNote = NormalizeOptionalText(request.SessionNote, 4000, "Anotação livre");
        var tags = NormalizeTags(request.Tags);
        var now = DateTimeOffset.UtcNow;

        var draft = new ClinicalDraft
        {
            AppointmentId = appointment.Id,
            PatientId = appointment.CustomerId,
            ProfessionalId = appointment.ProfessionalId,
            SpaceId = appointment.SpaceId,
            CreatedByUserId = professionalUserId,
            Status = "draft",
            Source = "manual",
            RecordType = "session_evolution",
            SessionNote = sessionNote,
            ContentText = contentText,
            TagsJson = JsonSerializer.Serialize(tags, JsonOptions),
            AiGenerated = false,
            CreatedAt = now
        };

        dbContext.ClinicalDrafts.Add(draft);
        dbContext.PatientTimelineItems.Add(new PatientTimelineItem
        {
            AppointmentId = appointment.Id,
            PatientId = appointment.CustomerId,
            ProfessionalId = appointment.ProfessionalId,
            SpaceId = appointment.SpaceId,
            CreatedByUserId = professionalUserId,
            SourceType = "draft",
            SourceId = draft.Id,
            Title = "Rascunho clínico criado",
            Summary = BuildDraftSummary(contentText, tags),
            Layer = "rascunho",
            OccurredAt = now,
            CreatedAt = now
        });
        await AddClinicalAuditAsync(
            professionalUserId,
            appointment.SpaceId,
            "clinical.draft.created",
            nameof(ClinicalDraft),
            draft.Id,
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(draft);
    }

    public async Task<ClinicalDraftDto> CreateRecordRectificationDraftAsync(
        Guid professionalUserId,
        Guid recordId,
        CancellationToken cancellationToken)
    {
        var professional = await GetLinkedProfessionalAsync(professionalUserId, cancellationToken);
        var record = await dbContext.ClinicalRecords
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == recordId, cancellationToken);

        if (record is null || record.ProfessionalId != professional.Id)
        {
            throw new KeyNotFoundException("Prontuário clínico não encontrado.");
        }

        if (record.Status != "approved")
        {
            throw new InvalidOperationException("Apenas prontuários aprovados podem ser retificados.");
        }

        var existingOpenDraft = await dbContext.ClinicalDrafts
            .AsNoTracking()
            .Where(draft =>
                draft.PreviousRecordId == record.Id &&
                draft.RecordType == "rectification" &&
                draft.Status == "draft")
            .OrderByDescending(draft => draft.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (existingOpenDraft is not null)
        {
            throw new InvalidOperationException("Já existe um rascunho de retificação aberto para este prontuário.");
        }

        var now = DateTimeOffset.UtcNow;
        var draft = new ClinicalDraft
        {
            AppointmentId = record.AppointmentId,
            PatientId = record.PatientId,
            ProfessionalId = record.ProfessionalId,
            SpaceId = record.SpaceId,
            CreatedByUserId = professionalUserId,
            Status = "draft",
            Source = "rectification",
            RecordType = "rectification",
            PreviousRecordId = record.Id,
            SessionNote = $"Retificação da evolução v{record.Version}.",
            ContentText = BuildRectificationDraftText(record),
            TagsJson = record.TagsJson,
            AiGenerated = false,
            CreatedAt = now
        };

        dbContext.ClinicalDrafts.Add(draft);
        dbContext.PatientTimelineItems.Add(new PatientTimelineItem
        {
            AppointmentId = record.AppointmentId,
            PatientId = record.PatientId,
            ProfessionalId = record.ProfessionalId,
            SpaceId = record.SpaceId,
            CreatedByUserId = professionalUserId,
            SourceType = "draft",
            SourceId = draft.Id,
            Title = "Retificação em rascunho",
            Summary = $"Rascunho de retificação criado a partir da evolução v{record.Version}. O prontuário original permanece preservado.",
            Layer = "rascunho",
            OccurredAt = now,
            CreatedAt = now
        });
        await AddClinicalAuditAsync(
            professionalUserId,
            record.SpaceId,
            "clinical.record.rectification_draft.created",
            nameof(ClinicalDraft),
            draft.Id,
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(draft);
    }

    public async Task<IReadOnlyList<AppliedClinicalTagDto>> ApplyAppointmentTagsAsync(
        Guid professionalUserId,
        Guid appointmentId,
        ApplyClinicalTagsRequest request,
        CancellationToken cancellationToken)
    {
        var appointment = await EnsureProfessionalAppointmentAsync(professionalUserId, appointmentId, cancellationToken);
        var tags = NormalizeTags(request.Tags);
        var note = NormalizeOptionalText(request.Note, 500, "Nota da tag");
        var now = DateTimeOffset.UtcNow;

        var existing = await dbContext.AppliedClinicalTags
            .Where(tag => tag.AppointmentId == appointment.Id)
            .ToListAsync(cancellationToken);
        dbContext.AppliedClinicalTags.RemoveRange(existing);

        var appliedTags = tags.Select(tag => new AppliedClinicalTag
        {
            AppointmentId = appointment.Id,
            PatientId = appointment.CustomerId,
            ProfessionalId = appointment.ProfessionalId,
            SpaceId = appointment.SpaceId,
            AppliedByUserId = professionalUserId,
            Label = tag.Label,
            Tone = tag.Tone,
            Note = note,
            AppliedAt = now
        }).ToList();

        dbContext.AppliedClinicalTags.AddRange(appliedTags);
        dbContext.PatientTimelineItems.Add(new PatientTimelineItem
        {
            AppointmentId = appointment.Id,
            PatientId = appointment.CustomerId,
            ProfessionalId = appointment.ProfessionalId,
            SpaceId = appointment.SpaceId,
            CreatedByUserId = professionalUserId,
            SourceType = "tag",
            SourceId = appointment.Id,
            Title = "Tags clínicas atualizadas",
            Summary = tags.Count == 0
                ? "Todas as tags desta sessão foram removidas."
                : $"Tags marcadas: {string.Join(", ", tags.Select(tag => tag.Label))}.",
            Layer = "memoria",
            OccurredAt = now,
            CreatedAt = now
        });
        await AddClinicalAuditAsync(
            professionalUserId,
            appointment.SpaceId,
            "clinical.tags.updated",
            nameof(AppliedClinicalTag),
            appointment.Id,
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return appliedTags.Select(ToDto).ToList();
    }

    public async Task<ClinicalRecordDto> ApproveDraftAsync(
        Guid professionalUserId,
        Guid draftId,
        ApproveClinicalDraftRequest request,
        CancellationToken cancellationToken)
    {
        var professional = await GetLinkedProfessionalAsync(professionalUserId, cancellationToken);
        var draft = await dbContext.ClinicalDrafts
            .FirstOrDefaultAsync(item => item.Id == draftId, cancellationToken);

        if (draft is null || draft.ProfessionalId != professional.Id)
        {
            throw new KeyNotFoundException("Rascunho clínico não encontrado.");
        }

        if (draft.Status != "draft")
        {
            throw new InvalidOperationException("Apenas rascunhos em aberto podem ser aprovados.");
        }

        var contentText = string.IsNullOrWhiteSpace(request.ContentText)
            ? draft.ContentText
            : ValidateText(request.ContentText, "Prontuário", 3, 8000);
        var recordType = NormalizeRecordType(draft.RecordType);
        var now = DateTimeOffset.UtcNow;
        var latestRecord = await dbContext.ClinicalRecords
            .Where(record =>
                record.PatientId == draft.PatientId &&
                record.ProfessionalId == draft.ProfessionalId)
            .OrderByDescending(record => record.Version)
            .FirstOrDefaultAsync(cancellationToken);
        var previousRecord = latestRecord;

        if (recordType == "rectification")
        {
            if (draft.PreviousRecordId is null)
            {
                throw new InvalidOperationException("Rascunho de retificação precisa apontar para um prontuário aprovado.");
            }

            previousRecord = await dbContext.ClinicalRecords
                .AsNoTracking()
                .FirstOrDefaultAsync(record => record.Id == draft.PreviousRecordId.Value, cancellationToken);

            if (previousRecord is null ||
                previousRecord.PatientId != draft.PatientId ||
                previousRecord.ProfessionalId != draft.ProfessionalId)
            {
                throw new InvalidOperationException("Prontuário anterior da retificação não pertence ao mesmo vínculo clínico.");
            }

            if (previousRecord.Status != "approved")
            {
                throw new InvalidOperationException("Apenas prontuários aprovados podem receber retificação.");
            }
        }

        var version = (latestRecord?.Version ?? 0) + 1;
        var record = new ClinicalRecord
        {
            AppointmentId = draft.AppointmentId,
            DraftId = draft.Id,
            PatientId = draft.PatientId,
            ProfessionalId = draft.ProfessionalId,
            SpaceId = draft.SpaceId,
            ApprovedByUserId = professionalUserId,
            RecordType = recordType,
            Status = "approved",
            ContentText = contentText,
            TagsJson = draft.TagsJson,
            Version = version,
            PreviousRecordId = previousRecord?.Id,
            ApprovedAt = now,
            CreatedAt = now
        };

        draft.Status = "converted_to_record";
        draft.ContentText = contentText;
        draft.UpdatedAt = now;

        dbContext.ClinicalRecords.Add(record);
        dbContext.PatientTimelineItems.Add(new PatientTimelineItem
        {
            AppointmentId = draft.AppointmentId,
            PatientId = draft.PatientId,
            ProfessionalId = draft.ProfessionalId,
            SpaceId = draft.SpaceId,
            CreatedByUserId = professionalUserId,
            SourceType = "record",
            SourceId = record.Id,
            Title = recordType == "rectification" ? "Retificação aprovada" : "Evolução aprovada",
            Summary = recordType == "rectification"
                ? $"Retificação aprovada pela psicóloga. Versão {version}."
                : $"Prontuário aprovado pela psicóloga. Versão {version}.",
            Layer = "prontuario",
            OccurredAt = now,
            CreatedAt = now
        });
        await AddClinicalAuditAsync(
            professionalUserId,
            draft.SpaceId,
            recordType == "rectification" ? "clinical.record.rectification.approved" : "clinical.record.approved",
            nameof(ClinicalRecord),
            record.Id,
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(record);
    }

    public async Task<PatientConsentDto> UpdateAppointmentConsentAsync(
        Guid professionalUserId,
        Guid appointmentId,
        string consentType,
        UpdatePatientConsentRequest request,
        CancellationToken cancellationToken)
    {
        var appointment = await EnsureProfessionalAppointmentAsync(professionalUserId, appointmentId, cancellationToken);
        var normalizedType = ValidateConsentType(consentType);
        var normalizedStatus = ValidateConsentStatus(request.Status);
        var termsVersion = NormalizeOptionalText(request.TermsVersion, 40, "Versão dos termos") ?? "clinical-consent-v1";
        var now = DateTimeOffset.UtcNow;

        var consent = await dbContext.PatientConsents
            .FirstOrDefaultAsync(item =>
                    item.PatientId == appointment.CustomerId &&
                    item.ProfessionalId == appointment.ProfessionalId &&
                    item.ConsentType == normalizedType,
                cancellationToken);

        if (consent is null)
        {
            consent = new PatientConsent
            {
                PatientId = appointment.CustomerId,
                ProfessionalId = appointment.ProfessionalId,
                SpaceId = appointment.SpaceId,
                UpdatedByUserId = professionalUserId,
                ConsentType = normalizedType,
                Status = normalizedStatus,
                TermsVersion = termsVersion,
                CreatedAt = now,
                UpdatedAt = now
            };
            dbContext.PatientConsents.Add(consent);
        }

        consent.Status = normalizedStatus;
        consent.TermsVersion = termsVersion;
        consent.UpdatedByUserId = professionalUserId;
        consent.UpdatedAt = now;
        consent.ExpiresAt = normalizedStatus == "granted" ? request.ExpiresAt : null;

        if (normalizedStatus == "granted")
        {
            consent.GrantedAt = now;
            consent.RevokedAt = null;
        }
        else if (normalizedStatus == "revoked")
        {
            consent.RevokedAt = now;
        }
        else if (normalizedStatus == "expired")
        {
            consent.ExpiresAt = request.ExpiresAt ?? now;
        }
        else
        {
            consent.GrantedAt = null;
            consent.RevokedAt = null;
        }

        dbContext.PatientTimelineItems.Add(new PatientTimelineItem
        {
            AppointmentId = appointment.Id,
            PatientId = appointment.CustomerId,
            ProfessionalId = appointment.ProfessionalId,
            SpaceId = appointment.SpaceId,
            CreatedByUserId = professionalUserId,
            SourceType = "consent",
            SourceId = consent.Id,
            Title = "Consentimento atualizado",
            Summary = $"Consentimento para {ConsentTypeLabel(normalizedType)}: {ConsentStatusLabel(normalizedStatus)}.",
            Layer = "memoria",
            OccurredAt = now,
            CreatedAt = now
        });
        await AddClinicalAuditAsync(
            professionalUserId,
            appointment.SpaceId,
            "clinical.consent.updated",
            nameof(PatientConsent),
            consent.Id,
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(consent);
    }

    public async Task<TreatmentPlanDto> UpdateAppointmentTreatmentPlanAsync(
        Guid professionalUserId,
        Guid appointmentId,
        UpdateTreatmentPlanRequest request,
        CancellationToken cancellationToken)
    {
        var appointment = await EnsureProfessionalAppointmentAsync(professionalUserId, appointmentId, cancellationToken);
        var status = ValidateTreatmentPlanStatus(request.Status);
        var caseFormulation = NormalizeOptionalText(request.CaseFormulation, 4000, "Formulação do caso");
        var goals = NormalizePlanItems(request.Goals, "Objetivo");
        var strategies = NormalizePlanItems(request.Strategies, "Estratégia");
        var obstacles = NormalizePlanItems(request.Obstacles, "Ponto de atenção");
        var reviewCadence = NormalizeOptionalText(request.ReviewCadence, 160, "Cadência de revisão");
        var now = DateTimeOffset.UtcNow;

        var plan = await dbContext.TreatmentPlans
            .FirstOrDefaultAsync(item =>
                    item.PatientId == appointment.CustomerId &&
                    item.ProfessionalId == appointment.ProfessionalId,
                cancellationToken);

        if (plan is null)
        {
            plan = new TreatmentPlan
            {
                PatientId = appointment.CustomerId,
                ProfessionalId = appointment.ProfessionalId,
                SpaceId = appointment.SpaceId,
                UpdatedByUserId = professionalUserId,
                Status = status,
                CreatedAt = now,
                UpdatedAt = now
            };
            dbContext.TreatmentPlans.Add(plan);
        }

        plan.SpaceId = appointment.SpaceId;
        plan.UpdatedByUserId = professionalUserId;
        plan.Status = status;
        plan.CaseFormulation = caseFormulation;
        plan.GoalsJson = JsonSerializer.Serialize(goals, JsonOptions);
        plan.StrategiesJson = JsonSerializer.Serialize(strategies, JsonOptions);
        plan.ObstaclesJson = JsonSerializer.Serialize(obstacles, JsonOptions);
        plan.ReviewCadence = reviewCadence;
        plan.UpdatedAt = now;

        dbContext.PatientTimelineItems.Add(new PatientTimelineItem
        {
            AppointmentId = appointment.Id,
            PatientId = appointment.CustomerId,
            ProfessionalId = appointment.ProfessionalId,
            SpaceId = appointment.SpaceId,
            CreatedByUserId = professionalUserId,
            SourceType = "plan_update",
            SourceId = plan.Id,
            Title = "Plano terapêutico atualizado",
            Summary = BuildTreatmentPlanSummary(goals.Count, strategies.Count, obstacles.Count, status),
            Layer = "memoria",
            OccurredAt = now,
            CreatedAt = now
        });
        await AddClinicalAuditAsync(
            professionalUserId,
            appointment.SpaceId,
            "clinical.treatment_plan.updated",
            nameof(TreatmentPlan),
            plan.Id,
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(plan);
    }

    public async Task<PatientTaskDto> CreateAppointmentTaskAsync(
        Guid professionalUserId,
        Guid appointmentId,
        CreatePatientTaskRequest request,
        CancellationToken cancellationToken)
    {
        var appointment = await EnsureProfessionalAppointmentAsync(professionalUserId, appointmentId, cancellationToken);
        var now = DateTimeOffset.UtcNow;
        var task = new PatientTask
        {
            AppointmentId = appointment.Id,
            PatientId = appointment.CustomerId,
            ProfessionalId = appointment.ProfessionalId,
            SpaceId = appointment.SpaceId,
            CreatedByUserId = professionalUserId,
            Title = ValidateText(request.Title, "Título da tarefa", 3, 160),
            Description = NormalizeOptionalText(request.Description, 1000, "Descrição da tarefa"),
            DueAt = NormalizeFutureDate(request.DueAt, "Prazo da tarefa"),
            Status = "private",
            AcceptsResponse = request.AcceptsResponse,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.PatientTasks.Add(task);
        dbContext.PatientTimelineItems.Add(new PatientTimelineItem
        {
            AppointmentId = appointment.Id,
            PatientId = appointment.CustomerId,
            ProfessionalId = appointment.ProfessionalId,
            SpaceId = appointment.SpaceId,
            CreatedByUserId = professionalUserId,
            SourceType = "task",
            SourceId = task.Id,
            Title = "Tarefa privada criada",
            Summary = "Tarefa preparada pela psicóloga. Ainda não foi compartilhada com o paciente.",
            Layer = "memoria",
            OccurredAt = now,
            CreatedAt = now
        });
        await AddClinicalAuditAsync(
            professionalUserId,
            appointment.SpaceId,
            "clinical.task.created",
            nameof(PatientTask),
            task.Id,
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(task);
    }

    public async Task<PatientTaskDto> ShareTaskAsync(
        Guid professionalUserId,
        Guid taskId,
        CancellationToken cancellationToken)
    {
        var professional = await GetLinkedProfessionalAsync(professionalUserId, cancellationToken);
        var task = await dbContext.PatientTasks
            .FirstOrDefaultAsync(item => item.Id == taskId, cancellationToken);

        if (task is null || task.ProfessionalId != professional.Id)
        {
            throw new KeyNotFoundException("Tarefa clínica não encontrada.");
        }

        EnsureShareableCanChange(task.Status, "Tarefa");
        await EnsureConsentGrantedAsync(task.PatientId, task.ProfessionalId, "portal", "Compartilhar tarefa exige consentimento ativo para o portal do paciente.", cancellationToken);

        var now = DateTimeOffset.UtcNow;
        task.Status = "shared";
        task.SharedAt ??= now;
        task.UpdatedAt = now;

        dbContext.PatientTimelineItems.Add(new PatientTimelineItem
        {
            AppointmentId = task.AppointmentId,
            PatientId = task.PatientId,
            ProfessionalId = task.ProfessionalId,
            SpaceId = task.SpaceId,
            CreatedByUserId = professionalUserId,
            SourceType = "task",
            SourceId = task.Id,
            Title = "Tarefa compartilhada",
            Summary = "Tarefa liberada pela psicóloga para o paciente no portal.",
            Layer = "compartilhado",
            OccurredAt = now,
            CreatedAt = now
        });
        await AddClinicalAuditAsync(
            professionalUserId,
            task.SpaceId,
            "clinical.task.shared",
            nameof(PatientTask),
            task.Id,
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(task);
    }

    public async Task<PatientTaskDto> UnshareTaskAsync(
        Guid professionalUserId,
        Guid taskId,
        CancellationToken cancellationToken)
    {
        var professional = await GetLinkedProfessionalAsync(professionalUserId, cancellationToken);
        var task = await dbContext.PatientTasks
            .FirstOrDefaultAsync(item => item.Id == taskId, cancellationToken);

        if (task is null || task.ProfessionalId != professional.Id)
        {
            throw new KeyNotFoundException("Tarefa clínica não encontrada.");
        }

        EnsureShareableCanChange(task.Status, "Tarefa");
        var now = DateTimeOffset.UtcNow;
        task.Status = "private";
        task.SharedAt = null;
        task.UpdatedAt = now;

        dbContext.PatientTimelineItems.Add(new PatientTimelineItem
        {
            AppointmentId = task.AppointmentId,
            PatientId = task.PatientId,
            ProfessionalId = task.ProfessionalId,
            SpaceId = task.SpaceId,
            CreatedByUserId = professionalUserId,
            SourceType = "task",
            SourceId = task.Id,
            Title = "Tarefa recolhida",
            Summary = "Tarefa deixou de ficar disponível no portal do paciente.",
            Layer = "memoria",
            OccurredAt = now,
            CreatedAt = now
        });
        await AddClinicalAuditAsync(
            professionalUserId,
            task.SpaceId,
            "clinical.task.unshared",
            nameof(PatientTask),
            task.Id,
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(task);
    }

    public async Task<SharedMaterialDto> CreateAppointmentMaterialAsync(
        Guid professionalUserId,
        Guid appointmentId,
        CreateSharedMaterialRequest request,
        CancellationToken cancellationToken)
    {
        var appointment = await EnsureProfessionalAppointmentAsync(professionalUserId, appointmentId, cancellationToken);
        var materialType = ValidateMaterialType(request.MaterialType);
        var description = NormalizeOptionalText(request.Description, 1200, "Descrição do material");
        var url = NormalizeMaterialUrl(request.Url, materialType);
        if (materialType == "text" && description is null)
        {
            throw new InvalidOperationException("Material de texto precisa de uma descrição.");
        }

        var now = DateTimeOffset.UtcNow;
        var material = new SharedMaterial
        {
            AppointmentId = appointment.Id,
            PatientId = appointment.CustomerId,
            ProfessionalId = appointment.ProfessionalId,
            SpaceId = appointment.SpaceId,
            CreatedByUserId = professionalUserId,
            MaterialType = materialType,
            Title = ValidateText(request.Title, "Título do material", 3, 160),
            Description = description,
            Url = url,
            Status = "private",
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.SharedMaterials.Add(material);
        dbContext.PatientTimelineItems.Add(new PatientTimelineItem
        {
            AppointmentId = appointment.Id,
            PatientId = appointment.CustomerId,
            ProfessionalId = appointment.ProfessionalId,
            SpaceId = appointment.SpaceId,
            CreatedByUserId = professionalUserId,
            SourceType = "material",
            SourceId = material.Id,
            Title = "Material privado criado",
            Summary = "Material preparado pela psicóloga. Ainda não foi compartilhado com o paciente.",
            Layer = "memoria",
            OccurredAt = now,
            CreatedAt = now
        });
        await AddClinicalAuditAsync(
            professionalUserId,
            appointment.SpaceId,
            "clinical.material.created",
            nameof(SharedMaterial),
            material.Id,
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(material);
    }

    public async Task<SharedMaterialDto> ShareMaterialAsync(
        Guid professionalUserId,
        Guid materialId,
        CancellationToken cancellationToken)
    {
        var professional = await GetLinkedProfessionalAsync(professionalUserId, cancellationToken);
        var material = await dbContext.SharedMaterials
            .FirstOrDefaultAsync(item => item.Id == materialId, cancellationToken);

        if (material is null || material.ProfessionalId != professional.Id)
        {
            throw new KeyNotFoundException("Material clínico não encontrado.");
        }

        EnsureShareableCanChange(material.Status, "Material");
        await EnsureConsentGrantedAsync(material.PatientId, material.ProfessionalId, "portal", "Compartilhar material exige consentimento ativo para o portal do paciente.", cancellationToken);
        await EnsureConsentGrantedAsync(material.PatientId, material.ProfessionalId, "materials", "Compartilhar material exige consentimento ativo para materiais compartilhados.", cancellationToken);

        var now = DateTimeOffset.UtcNow;
        material.Status = "shared";
        material.SharedAt ??= now;
        material.UpdatedAt = now;

        dbContext.PatientTimelineItems.Add(new PatientTimelineItem
        {
            AppointmentId = material.AppointmentId,
            PatientId = material.PatientId,
            ProfessionalId = material.ProfessionalId,
            SpaceId = material.SpaceId,
            CreatedByUserId = professionalUserId,
            SourceType = "material",
            SourceId = material.Id,
            Title = "Material compartilhado",
            Summary = "Material liberado pela psicóloga para o paciente no portal.",
            Layer = "compartilhado",
            OccurredAt = now,
            CreatedAt = now
        });
        await AddClinicalAuditAsync(
            professionalUserId,
            material.SpaceId,
            "clinical.material.shared",
            nameof(SharedMaterial),
            material.Id,
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(material);
    }

    public async Task<SharedMaterialDto> UnshareMaterialAsync(
        Guid professionalUserId,
        Guid materialId,
        CancellationToken cancellationToken)
    {
        var professional = await GetLinkedProfessionalAsync(professionalUserId, cancellationToken);
        var material = await dbContext.SharedMaterials
            .FirstOrDefaultAsync(item => item.Id == materialId, cancellationToken);

        if (material is null || material.ProfessionalId != professional.Id)
        {
            throw new KeyNotFoundException("Material clínico não encontrado.");
        }

        EnsureShareableCanChange(material.Status, "Material");
        var now = DateTimeOffset.UtcNow;
        material.Status = "private";
        material.SharedAt = null;
        material.UpdatedAt = now;

        dbContext.PatientTimelineItems.Add(new PatientTimelineItem
        {
            AppointmentId = material.AppointmentId,
            PatientId = material.PatientId,
            ProfessionalId = material.ProfessionalId,
            SpaceId = material.SpaceId,
            CreatedByUserId = professionalUserId,
            SourceType = "material",
            SourceId = material.Id,
            Title = "Material recolhido",
            Summary = "Material deixou de ficar disponível no portal do paciente.",
            Layer = "memoria",
            OccurredAt = now,
            CreatedAt = now
        });
        await AddClinicalAuditAsync(
            professionalUserId,
            material.SpaceId,
            "clinical.material.unshared",
            nameof(SharedMaterial),
            material.Id,
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(material);
    }

    public async Task<ClinicalSessionDto> StartAppointmentSessionAsync(
        Guid professionalUserId,
        Guid appointmentId,
        CancellationToken cancellationToken)
    {
        var appointment = await EnsureProfessionalAppointmentAsync(professionalUserId, appointmentId, cancellationToken);
        var session = await EnsureClinicalSessionAsync(appointment, professionalUserId, cancellationToken);

        if (session.Status is "cancelled" or "no_show" or "completed")
        {
            throw new InvalidOperationException("Esta sessão clínica não pode ser iniciada neste status.");
        }

        var now = DateTimeOffset.UtcNow;
        session.Status = "in_progress";
        session.StartedAt ??= now;
        session.EndedAt = null;
        session.UpdatedAt = now;

        dbContext.PatientTimelineItems.Add(new PatientTimelineItem
        {
            AppointmentId = appointment.Id,
            PatientId = appointment.CustomerId,
            ProfessionalId = appointment.ProfessionalId,
            SpaceId = appointment.SpaceId,
            CreatedByUserId = professionalUserId,
            SourceType = "session",
            SourceId = session.Id,
            Title = "Sessão clínica iniciada",
            Summary = "A sessão clínica foi marcada como em andamento pela psicóloga.",
            Layer = "memoria",
            OccurredAt = now,
            CreatedAt = now
        });
        await AddClinicalAuditAsync(
            professionalUserId,
            appointment.SpaceId,
            "clinical.session.started",
            nameof(ClinicalSession),
            session.Id,
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(session);
    }

    public async Task<ClinicalSessionDto> CompleteAppointmentSessionAsync(
        Guid professionalUserId,
        Guid appointmentId,
        CancellationToken cancellationToken)
    {
        var appointment = await EnsureProfessionalAppointmentAsync(professionalUserId, appointmentId, cancellationToken);
        var session = await EnsureClinicalSessionAsync(appointment, professionalUserId, cancellationToken);

        if (session.Status is "cancelled" or "no_show")
        {
            throw new InvalidOperationException("Esta sessão clínica não pode ser finalizada neste status.");
        }

        var now = DateTimeOffset.UtcNow;
        session.Status = "completed";
        session.StartedAt ??= appointment.StartDateTime;
        session.EndedAt ??= now;
        session.UpdatedAt = now;

        dbContext.PatientTimelineItems.Add(new PatientTimelineItem
        {
            AppointmentId = appointment.Id,
            PatientId = appointment.CustomerId,
            ProfessionalId = appointment.ProfessionalId,
            SpaceId = appointment.SpaceId,
            CreatedByUserId = professionalUserId,
            SourceType = "session",
            SourceId = session.Id,
            Title = "Sessão clínica finalizada",
            Summary = "A sessão clínica foi marcada como concluída e já pode receber evolução revisada.",
            Layer = "memoria",
            OccurredAt = now,
            CreatedAt = now
        });
        await AddClinicalAuditAsync(
            professionalUserId,
            appointment.SpaceId,
            "clinical.session.completed",
            nameof(ClinicalSession),
            session.Id,
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(session);
    }

    private async Task<IReadOnlyList<PatientConsentDto>> GetPatientConsentsAsync(
        Appointment appointment,
        CancellationToken cancellationToken)
    {
        var stored = await dbContext.PatientConsents
            .AsNoTracking()
            .Where(consent =>
                consent.PatientId == appointment.CustomerId &&
                consent.ProfessionalId == appointment.ProfessionalId)
            .ToListAsync(cancellationToken);
        var byType = stored.ToDictionary(consent => consent.ConsentType, StringComparer.OrdinalIgnoreCase);

        return ConsentTypes
            .Select(type => byType.TryGetValue(type, out var consent)
                ? ToDto(consent)
                : new PatientConsentDto(
                    null,
                    appointment.CustomerId,
                    appointment.ProfessionalId,
                    appointment.SpaceId,
                    type,
                    "pending",
                    "clinical-consent-v1",
                    null,
                    null,
                    null,
                    null))
            .ToList();
    }

    private async Task<TreatmentPlanDto> GetTreatmentPlanAsync(
        Appointment appointment,
        CancellationToken cancellationToken)
    {
        var plan = await dbContext.TreatmentPlans
            .AsNoTracking()
            .FirstOrDefaultAsync(item =>
                    item.PatientId == appointment.CustomerId &&
                    item.ProfessionalId == appointment.ProfessionalId,
                cancellationToken);

        return plan is null
            ? new TreatmentPlanDto(
                null,
                appointment.CustomerId,
                appointment.ProfessionalId,
                appointment.SpaceId,
                "active",
                null,
                [],
                [],
                [],
                null,
                null,
                null)
            : ToDto(plan);
    }

    private async Task<ClinicalSession> EnsureClinicalSessionAsync(
        Appointment appointment,
        Guid professionalUserId,
        CancellationToken cancellationToken)
    {
        var session = await dbContext.ClinicalSessions
            .FirstOrDefaultAsync(item => item.AppointmentId == appointment.Id, cancellationToken);
        var now = DateTimeOffset.UtcNow;

        if (session is null)
        {
            session = new ClinicalSession
            {
                AppointmentId = appointment.Id,
                PatientId = appointment.CustomerId,
                ProfessionalId = appointment.ProfessionalId,
                SpaceId = appointment.SpaceId,
                SessionType = appointment.OnlineRoomUrl is null ? "in_person" : "online",
                Status = InitialClinicalSessionStatus(appointment.Status),
                StartedAt = appointment.Status == AppointmentStatus.Completed ? appointment.StartDateTime : null,
                EndedAt = appointment.Status == AppointmentStatus.Completed ? appointment.EndDateTime : null,
                CreatedAt = now,
                UpdatedAt = now
            };
            dbContext.ClinicalSessions.Add(session);
            await AddClinicalAuditAsync(
                professionalUserId,
                appointment.SpaceId,
                "clinical.session.created",
                nameof(ClinicalSession),
                session.Id,
                cancellationToken);

            return session;
        }

        var appointmentDerivedStatus = InitialClinicalSessionStatus(appointment.Status);
        if (appointmentDerivedStatus is "cancelled" or "no_show" &&
            session.Status is not ("completed" or "cancelled" or "no_show"))
        {
            session.Status = appointmentDerivedStatus;
            session.EndedAt ??= now;
            session.UpdatedAt = now;
        }
        else if (appointmentDerivedStatus == "completed" && session.Status is ("scheduled" or "in_progress"))
        {
            session.Status = "completed";
            session.StartedAt ??= appointment.StartDateTime;
            session.EndedAt ??= appointment.EndDateTime;
            session.UpdatedAt = now;
        }

        return session;
    }

    private static string InitialClinicalSessionStatus(AppointmentStatus appointmentStatus)
    {
        return appointmentStatus switch
        {
            AppointmentStatus.Completed => "completed",
            AppointmentStatus.Cancelled or AppointmentStatus.Expired or AppointmentStatus.Rejected => "cancelled",
            AppointmentStatus.NoShow => "no_show",
            _ => "scheduled"
        };
    }

    private async Task<Appointment> EnsureProfessionalAppointmentAsync(
        Guid professionalUserId,
        Guid appointmentId,
        CancellationToken cancellationToken)
    {
        var professional = await GetLinkedProfessionalAsync(professionalUserId, cancellationToken);
        var appointment = await dbContext.Appointments
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == appointmentId, cancellationToken);

        if (appointment is null || appointment.ProfessionalId != professional.Id)
        {
            throw new KeyNotFoundException("Atendimento clínico não encontrado.");
        }

        return appointment;
    }

    private async Task EnsurePatientUserAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == userId && item.Active, cancellationToken);

        if (user is null || user.Role != UserRole.Customer)
        {
            throw new UnauthorizedAccessException("Portal do paciente exige uma conta de paciente ativa.");
        }
    }

    private async Task<Professional> GetLinkedProfessionalAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == userId && item.Active, cancellationToken);

        if (user is null)
        {
            throw new UnauthorizedAccessException("Usuário autenticado não encontrado.");
        }

        var professional = await dbContext.Professionals
            .AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.Active && item.Email != null && item.Email == user.Email,
                cancellationToken);

        if (professional is null)
        {
            throw new InvalidOperationException("Seu e-mail ainda não está vinculado a uma profissional ativa do espaço.");
        }

        return professional;
    }

    private async Task AddClinicalAuditAsync(
        Guid userId,
        Guid spaceId,
        string action,
        string entity,
        Guid entityId,
        CancellationToken cancellationToken)
    {
        dbContext.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            SpaceId = spaceId,
            Action = action,
            Entity = entity,
            EntityId = entityId.ToString(),
            MetadataJson = JsonSerializer.Serialize(new
            {
                Scope = "clinical",
                ContainsClinicalContent = false
            }, JsonOptions)
        });

        await Task.CompletedTask;
    }

    private static string NormalizeRecordType(string? recordType)
    {
        var normalized = string.IsNullOrWhiteSpace(recordType)
            ? "session_evolution"
            : recordType.Trim().ToLowerInvariant();

        if (!AllowedRecordTypes.Contains(normalized))
        {
            throw new InvalidOperationException("Tipo de prontuário clínico inválido.");
        }

        return normalized;
    }

    private static IReadOnlyList<ClinicalTagInput> NormalizeTags(IReadOnlyList<ClinicalTagInput>? tags)
    {
        if (tags is null || tags.Count == 0)
        {
            return [];
        }

        return tags
            .Select(tag => new ClinicalTagInput(
                ValidateText(tag.Label, "Tag", 2, 80),
                ValidateTagTone(tag.Tone)))
            .GroupBy(tag => tag.Label, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.First())
            .Take(20)
            .ToList();
    }

    private static string ValidateTagTone(string tone)
    {
        var normalized = string.IsNullOrWhiteSpace(tone) ? "neutral" : tone.Trim().ToLowerInvariant();

        if (!AllowedTagTones.Contains(normalized))
        {
            throw new InvalidOperationException("Tom da tag inválido.");
        }

        return normalized;
    }

    private static string ValidateConsentType(string consentType)
    {
        var normalized = string.IsNullOrWhiteSpace(consentType) ? string.Empty : consentType.Trim().ToLowerInvariant();

        if (!AllowedConsentTypes.Contains(normalized))
        {
            throw new InvalidOperationException("Tipo de consentimento clínico inválido.");
        }

        return normalized;
    }

    private static string ValidateConsentStatus(string status)
    {
        var normalized = string.IsNullOrWhiteSpace(status) ? string.Empty : status.Trim().ToLowerInvariant();

        if (!AllowedConsentStatuses.Contains(normalized))
        {
            throw new InvalidOperationException("Status de consentimento clínico inválido.");
        }

        return normalized;
    }

    private static string ValidateTreatmentPlanStatus(string status)
    {
        var normalized = string.IsNullOrWhiteSpace(status) ? "active" : status.Trim().ToLowerInvariant();

        if (!AllowedTreatmentPlanStatuses.Contains(normalized))
        {
            throw new InvalidOperationException("Status do plano terapêutico inválido.");
        }

        return normalized;
    }

    private static void EnsureShareableCanChange(string status, string entityName)
    {
        if (!AllowedShareableStatuses.Contains(status))
        {
            throw new InvalidOperationException($"{entityName} tem status inválido.");
        }

        if (status is "archived" or "completed")
        {
            throw new InvalidOperationException($"{entityName} concluída ou arquivada não pode mudar o compartilhamento.");
        }
    }

    private async Task EnsureConsentGrantedAsync(
        Guid patientId,
        Guid professionalId,
        string consentType,
        string message,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var granted = await dbContext.PatientConsents
            .AsNoTracking()
            .AnyAsync(consent =>
                    consent.PatientId == patientId &&
                    consent.ProfessionalId == professionalId &&
                    consent.ConsentType == consentType &&
                    consent.Status == "granted" &&
                    (consent.ExpiresAt == null || consent.ExpiresAt > now),
                cancellationToken);

        if (!granted)
        {
            throw new InvalidOperationException(message);
        }
    }

    private static DateTimeOffset? NormalizeFutureDate(DateTimeOffset? value, string fieldName)
    {
        if (value is null)
        {
            return null;
        }

        var normalized = value.Value.ToUniversalTime();
        if (normalized < DateTimeOffset.UtcNow.AddMinutes(-1))
        {
            throw new InvalidOperationException($"{fieldName} não pode estar no passado.");
        }

        return normalized;
    }

    private static string ValidateMaterialType(string materialType)
    {
        var normalized = string.IsNullOrWhiteSpace(materialType)
            ? "text"
            : materialType.Trim().ToLowerInvariant();

        if (!AllowedMaterialTypes.Contains(normalized))
        {
            throw new InvalidOperationException("Tipo de material compartilhável inválido.");
        }

        return normalized;
    }

    private static string? NormalizeMaterialUrl(string? url, string materialType)
    {
        if (materialType != "link")
        {
            return null;
        }

        var normalized = ValidateText(url ?? string.Empty, "Link do material", 8, 500);
        if (!Uri.TryCreate(normalized, UriKind.Absolute, out var uri) ||
            uri.Scheme is not ("http" or "https"))
        {
            throw new InvalidOperationException("Link do material deve ser uma URL http ou https válida.");
        }

        return normalized;
    }

    private static string ConsentTypeLabel(string consentType)
    {
        return consentType switch
        {
            "portal" => "portal do paciente",
            "checkins" => "check-ins",
            "materials" => "materiais compartilhados",
            "notifications" => "notificações",
            "ai_analysis" => "análise por IA",
            "recording" => "gravação",
            "transcription" => "transcrição",
            _ => consentType
        };
    }

    private static string ConsentStatusLabel(string status)
    {
        return status switch
        {
            "granted" => "concedido",
            "revoked" => "revogado",
            "expired" => "expirado",
            _ => "pendente"
        };
    }

    private static string ValidateText(string value, string fieldName, int minLength, int maxLength)
    {
        var trimmed = value.Trim();

        if (trimmed.Length < minLength)
        {
            throw new InvalidOperationException($"{fieldName} deve ter pelo menos {minLength} caracteres.");
        }

        if (trimmed.Length > maxLength)
        {
            throw new InvalidOperationException($"{fieldName} deve ter no máximo {maxLength} caracteres.");
        }

        return trimmed;
    }

    private static string? NormalizeOptionalText(string? value, int maxLength, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();

        if (trimmed.Length > maxLength)
        {
            throw new InvalidOperationException($"{fieldName} deve ter no máximo {maxLength} caracteres.");
        }

        return trimmed;
    }

    private static IReadOnlyList<string> NormalizePlanItems(IReadOnlyList<string>? values, string fieldName)
    {
        if (values is null || values.Count == 0)
        {
            return [];
        }

        return values
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => ValidateText(value, fieldName, 2, 220))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(12)
            .ToList();
    }

    private static string BuildDraftSummary(string contentText, IReadOnlyList<ClinicalTagInput> tags)
    {
        var firstLine = contentText
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .FirstOrDefault() ?? "Rascunho clínico criado.";
        var summary = firstLine.Length > 180 ? $"{firstLine[..177]}..." : firstLine;

        return tags.Count == 0
            ? summary
            : $"{summary} Tags: {string.Join(", ", tags.Select(tag => tag.Label))}.";
    }

    private static string BuildTreatmentPlanSummary(int goalsCount, int strategiesCount, int obstaclesCount, string status)
    {
        return $"Plano terapêutico revisado pela psicóloga. Status: {TreatmentPlanStatusLabel(status)}. Itens registrados: {goalsCount} objetivos, {strategiesCount} estratégias, {obstaclesCount} pontos de atenção.";
    }

    private static string TreatmentPlanStatusLabel(string status)
    {
        return status switch
        {
            "paused" => "pausado",
            "completed" => "concluído",
            "archived" => "arquivado",
            _ => "ativo"
        };
    }

    private static string BuildRectificationDraftText(ClinicalRecord record)
    {
        const int MaxDraftLength = 8000;
        const string OriginalLabel = "Texto original para referencia:";
        var header = $"""
            Retificação da evolução v{record.Version}

            Descreva abaixo apenas o ajuste necessário, preservando o histórico já aprovado. Esta retificação ainda é rascunho e precisa de aprovação manual antes de entrar no prontuário.

            """;
        var fullText = $"{header}{OriginalLabel}\n{record.ContentText}";

        if (fullText.Length <= MaxDraftLength)
        {
            return fullText;
        }

        var availableOriginalLength = Math.Max(0, MaxDraftLength - header.Length - OriginalLabel.Length - 4);
        return $"{header}{OriginalLabel}\n{record.ContentText[..availableOriginalLength]}...";
    }

    private static ClinicalDraftDto ToDto(ClinicalDraft draft)
    {
        var tags = string.IsNullOrWhiteSpace(draft.TagsJson)
            ? []
            : JsonSerializer.Deserialize<List<ClinicalTagInput>>(draft.TagsJson, JsonOptions) ?? [];

        return new ClinicalDraftDto(
            draft.Id,
            draft.AppointmentId,
            draft.PatientId,
            draft.ProfessionalId,
            draft.SpaceId,
            draft.Status,
            draft.Source,
            draft.RecordType,
            draft.PreviousRecordId,
            draft.SessionNote,
            draft.ContentText,
            tags,
            draft.AiGenerated,
            draft.CreatedAt,
            draft.UpdatedAt);
    }

    private static ClinicalSessionDto ToDto(ClinicalSession session)
    {
        return new ClinicalSessionDto(
            session.Id,
            session.AppointmentId,
            session.PatientId,
            session.ProfessionalId,
            session.SpaceId,
            session.SessionType,
            session.Status,
            session.StartedAt,
            session.EndedAt,
            session.CreatedAt,
            session.UpdatedAt);
    }

    private static AppliedClinicalTagDto ToDto(AppliedClinicalTag tag)
    {
        return new AppliedClinicalTagDto(
            tag.Id,
            tag.AppointmentId,
            tag.PatientId,
            tag.ProfessionalId,
            tag.SpaceId,
            tag.Label,
            tag.Tone,
            tag.Note,
            tag.AppliedAt);
    }

    private static ClinicalRecordDto ToDto(ClinicalRecord record)
    {
        var tags = string.IsNullOrWhiteSpace(record.TagsJson)
            ? []
            : JsonSerializer.Deserialize<List<ClinicalTagInput>>(record.TagsJson, JsonOptions) ?? [];

        return new ClinicalRecordDto(
            record.Id,
            record.AppointmentId,
            record.DraftId,
            record.PatientId,
            record.ProfessionalId,
            record.SpaceId,
            record.RecordType,
            record.Status,
            record.ContentText,
            tags,
            record.Version,
            record.PreviousRecordId,
            record.ApprovedAt,
            record.CreatedAt);
    }

    private static TreatmentPlanDto ToDto(TreatmentPlan plan)
    {
        return new TreatmentPlanDto(
            plan.Id,
            plan.PatientId,
            plan.ProfessionalId,
            plan.SpaceId,
            plan.Status,
            plan.CaseFormulation,
            DeserializeStringList(plan.GoalsJson),
            DeserializeStringList(plan.StrategiesJson),
            DeserializeStringList(plan.ObstaclesJson),
            plan.ReviewCadence,
            plan.CreatedAt,
            plan.UpdatedAt);
    }

    private static PatientTaskDto ToDto(PatientTask task)
    {
        return new PatientTaskDto(
            task.Id,
            task.AppointmentId,
            task.PatientId,
            task.ProfessionalId,
            task.SpaceId,
            task.Title,
            task.Description,
            task.DueAt,
            task.Status,
            task.AcceptsResponse,
            task.SharedAt,
            task.CompletedAt,
            task.CreatedAt,
            task.UpdatedAt);
    }

    private static SharedMaterialDto ToDto(SharedMaterial material)
    {
        return new SharedMaterialDto(
            material.Id,
            material.AppointmentId,
            material.PatientId,
            material.ProfessionalId,
            material.SpaceId,
            material.MaterialType,
            material.Title,
            material.Description,
            material.Url,
            material.Status,
            material.SharedAt,
            material.CreatedAt,
            material.UpdatedAt);
    }

    private static IReadOnlyList<string> DeserializeStringList(string? json)
    {
        return string.IsNullOrWhiteSpace(json)
            ? []
            : JsonSerializer.Deserialize<List<string>>(json, JsonOptions) ?? [];
    }

    private static PatientTimelineItemDto ToDto(PatientTimelineItem item)
    {
        return new PatientTimelineItemDto(
            item.Id,
            item.AppointmentId,
            item.PatientId,
            item.ProfessionalId,
            item.SpaceId,
            item.SourceType,
            item.SourceId,
            item.Title,
            item.Summary,
            item.Layer,
            item.OccurredAt,
            item.CreatedAt);
    }

    private static PatientConsentDto ToDto(PatientConsent consent)
    {
        return new PatientConsentDto(
            consent.Id,
            consent.PatientId,
            consent.ProfessionalId,
            consent.SpaceId,
            consent.ConsentType,
            consent.Status,
            consent.TermsVersion,
            consent.GrantedAt,
            consent.RevokedAt,
            consent.ExpiresAt,
            consent.UpdatedAt);
    }
}
