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
    private static readonly IReadOnlyList<string> PatientPortalConsentTypes =
    [
        "portal",
        "materials",
        "checkins",
        "notifications"
    ];
    private static readonly HashSet<string> AllowedConsentTypes = new(ConsentTypes, StringComparer.OrdinalIgnoreCase);
    private static readonly HashSet<string> AllowedPatientPortalConsentTypes = new(PatientPortalConsentTypes, StringComparer.OrdinalIgnoreCase);
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
    private static readonly HashSet<string> AllowedCheckInStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "private",
        "shared",
        "answered",
        "archived"
    };
    private static readonly HashSet<string> AllowedMaterialTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "text",
        "link"
    };
    private static readonly HashSet<string> AllowedAlertSeverities = new(StringComparer.OrdinalIgnoreCase)
    {
        "baixo",
        "medio",
        "alto"
    };
    private static readonly HashSet<string> AllowedAlertStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "pending",
        "confirmed",
        "dismissed",
        "monitoring",
        "resolved"
    };
    private static readonly HashSet<string> AllowedTimelineLayers = new(StringComparer.OrdinalIgnoreCase)
    {
        "rascunho",
        "prontuario",
        "memoria",
        "compartilhado"
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
        var checkIns = await dbContext.PatientCheckIns
            .AsNoTracking()
            .Where(checkIn =>
                checkIn.PatientId == appointment.CustomerId &&
                checkIn.ProfessionalId == appointment.ProfessionalId)
            .OrderByDescending(checkIn => checkIn.CreatedAt)
            .Take(20)
            .ToListAsync(cancellationToken);
        var alerts = await dbContext.ClinicalAlerts
            .AsNoTracking()
            .Where(alert =>
                alert.PatientId == appointment.CustomerId &&
                alert.ProfessionalId == appointment.ProfessionalId)
            .OrderBy(alert => alert.Status == "resolved" || alert.Status == "dismissed")
            .ThenByDescending(alert => alert.Severity == "alto")
            .ThenByDescending(alert => alert.CreatedAt)
            .Take(30)
            .ToListAsync(cancellationToken);
        var timeline = await dbContext.PatientTimelineItems
            .AsNoTracking()
            .Where(item =>
                item.PatientId == appointment.CustomerId &&
                item.ProfessionalId == appointment.ProfessionalId &&
                !item.Archived)
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
            checkIns.Select(ToDto).ToList(),
            alerts.Select(ToDto).ToList(),
            timeline.Select(ToDto).ToList());
    }

    public async Task<IReadOnlyList<ClinicalAlertDto>> GetPatientAlertsAsync(
        Guid professionalUserId,
        Guid patientId,
        CancellationToken cancellationToken)
    {
        var relationship = await EnsureProfessionalPatientRelationshipAsync(professionalUserId, patientId, cancellationToken);
        var alerts = await dbContext.ClinicalAlerts
            .AsNoTracking()
            .Where(alert =>
                alert.PatientId == patientId &&
                alert.ProfessionalId == relationship.ProfessionalId)
            .OrderBy(alert => alert.Status == "resolved" || alert.Status == "dismissed")
            .ThenByDescending(alert => alert.Severity == "alto")
            .ThenByDescending(alert => alert.CreatedAt)
            .Take(80)
            .ToListAsync(cancellationToken);

        await AddClinicalAuditAsync(
            professionalUserId,
            relationship.SpaceId,
            "clinical.alerts.viewed",
            "Patient",
            patientId,
            cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return alerts.Select(ToDto).ToList();
    }

    public async Task<IReadOnlyList<PatientTimelineItemDto>> GetPatientTimelineAsync(
        Guid professionalUserId,
        Guid patientId,
        PatientTimelineQuery query,
        CancellationToken cancellationToken)
    {
        var relationship = await EnsureProfessionalPatientRelationshipAsync(professionalUserId, patientId, cancellationToken);
        var sourceType = NormalizeTimelineSourceType(query.SourceType);
        var layer = NormalizeTimelineLayer(query.Layer);
        var tag = NormalizeTimelineTag(query.Tag);
        var severity = NormalizeTimelineSeverity(query.Severity);
        var search = NormalizeOptionalText(query.Search, 120, "Busca da timeline");
        var limit = query.Limit ?? 80;

        if (limit is < 1 or > 120)
        {
            throw new InvalidOperationException("Limite da timeline deve ficar entre 1 e 120 itens.");
        }

        var from = query.From?.ToUniversalTime();
        var to = query.To?.ToUniversalTime();
        if (from.HasValue && to.HasValue && from.Value > to.Value)
        {
            throw new InvalidOperationException("Período da timeline inválido.");
        }

        var timelineQuery = dbContext.PatientTimelineItems
            .AsNoTracking()
            .Where(item =>
                item.PatientId == patientId &&
                item.ProfessionalId == relationship.ProfessionalId &&
                !item.Archived);

        if (sourceType is not null)
        {
            timelineQuery = timelineQuery.Where(item => item.SourceType == sourceType);
        }

        if (layer is not null)
        {
            timelineQuery = timelineQuery.Where(item => item.Layer == layer);
        }

        if (tag is not null || severity is not null)
        {
            timelineQuery = timelineQuery.Where(item =>
                item.AppointmentId != null &&
                dbContext.AppliedClinicalTags.Any(appliedTag =>
                    appliedTag.AppointmentId == item.AppointmentId &&
                    appliedTag.PatientId == item.PatientId &&
                    appliedTag.ProfessionalId == item.ProfessionalId &&
                    (tag == null || appliedTag.Label.ToLower() == tag) &&
                    (severity == null || appliedTag.Tone == severity)));
        }

        if (from is DateTimeOffset fromValue)
        {
            timelineQuery = timelineQuery.Where(item => item.OccurredAt >= fromValue);
        }

        if (to is DateTimeOffset toValue)
        {
            timelineQuery = timelineQuery.Where(item => item.OccurredAt <= toValue);
        }

        if (search is not null)
        {
            var normalizedSearch = search.ToLowerInvariant();
            timelineQuery = timelineQuery.Where(item =>
                item.Title.ToLower().Contains(normalizedSearch) ||
                item.Summary.ToLower().Contains(normalizedSearch));
        }

        var items = await timelineQuery
            .OrderByDescending(item => item.OccurredAt)
            .ThenByDescending(item => item.CreatedAt)
            .Take(limit)
            .ToListAsync(cancellationToken);

        await AddClinicalAuditAsync(
            professionalUserId,
            relationship.SpaceId,
            "clinical.timeline.viewed",
            "Patient",
            patientId,
            cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return items.Select(ToDto).ToList();
    }

    public async Task<PatientTimelineItemDetailDto> GetTimelineItemDetailAsync(
        Guid professionalUserId,
        Guid itemId,
        CancellationToken cancellationToken)
    {
        var professional = await GetLinkedProfessionalAsync(professionalUserId, cancellationToken);
        var item = await dbContext.PatientTimelineItems
            .AsNoTracking()
            .FirstOrDefaultAsync(timelineItem =>
                    timelineItem.Id == itemId &&
                    timelineItem.ProfessionalId == professional.Id,
                cancellationToken);

        if (item is null)
        {
            throw new KeyNotFoundException("Item da timeline clínica não encontrado.");
        }

        await EnsureProfessionalPatientRelationshipAsync(professionalUserId, item.PatientId, cancellationToken);

        await AddClinicalAuditAsync(
            professionalUserId,
            item.SpaceId,
            "clinical.timeline_item.viewed",
            nameof(PatientTimelineItem),
            item.Id,
            cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return await BuildTimelineItemDetailDtoAsync(item, cancellationToken);
    }

    public async Task<PatientTimelineItemDetailDto> ArchiveTimelineItemAsync(
        Guid professionalUserId,
        Guid itemId,
        ArchiveTimelineItemRequest request,
        CancellationToken cancellationToken)
    {
        var professional = await GetLinkedProfessionalAsync(professionalUserId, cancellationToken);
        var item = await dbContext.PatientTimelineItems
            .FirstOrDefaultAsync(timelineItem =>
                    timelineItem.Id == itemId &&
                    timelineItem.ProfessionalId == professional.Id,
                cancellationToken);

        if (item is null)
        {
            throw new KeyNotFoundException("Item da timeline clínica não encontrado.");
        }

        await EnsureProfessionalPatientRelationshipAsync(professionalUserId, item.PatientId, cancellationToken);

        if (item.Archived)
        {
            throw new InvalidOperationException("Este item da timeline já está arquivado.");
        }

        if (!CanArchiveTimelineItem(item))
        {
            throw new InvalidOperationException("Itens de prontuário aprovado não podem ser arquivados pela timeline. Use retificação formal quando necessário.");
        }

        var now = DateTimeOffset.UtcNow;
        item.Archived = true;
        item.ArchivedAt = now;
        item.ArchivedByUserId = professionalUserId;
        item.ArchiveReason = NormalizeOptionalText(request.Reason, 500, "Motivo do arquivamento");

        await AddClinicalAuditAsync(
            professionalUserId,
            item.SpaceId,
            "clinical.timeline_item.archived",
            nameof(PatientTimelineItem),
            item.Id,
            cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return await BuildTimelineItemDetailDtoAsync(item, cancellationToken);
    }

    public async Task<PatientCarePortalDto> GetPatientCarePortalAsync(
        Guid patientUserId,
        CancellationToken cancellationToken)
    {
        await EnsurePatientUserAsync(patientUserId, cancellationToken);
        var now = DateTimeOffset.UtcNow;
        var consentRelationships = await GetPatientConsentRelationshipsAsync(patientUserId, cancellationToken);
        var consents = await GetPatientPortalConsentsAsync(patientUserId, consentRelationships, cancellationToken);

        var tasks = await dbContext.PatientTasks
            .AsNoTracking()
            .Where(task =>
                task.PatientId == patientUserId &&
                (task.Status == "shared" || task.Status == "completed") &&
                dbContext.PatientConsents.Any(consent =>
                    consent.PatientId == task.PatientId &&
                    consent.ProfessionalId == task.ProfessionalId &&
                    consent.ConsentType == "portal" &&
                    consent.Status == "granted" &&
                    (consent.ExpiresAt == null || consent.ExpiresAt > now)))
            .OrderBy(task => task.Status == "completed")
            .ThenBy(task => task.DueAt == null)
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

        var checkIns = await dbContext.PatientCheckIns
            .AsNoTracking()
            .Where(checkIn =>
                checkIn.PatientId == patientUserId &&
                (checkIn.Status == "shared" || checkIn.Status == "answered") &&
                dbContext.PatientConsents.Any(consent =>
                    consent.PatientId == checkIn.PatientId &&
                    consent.ProfessionalId == checkIn.ProfessionalId &&
                    consent.ConsentType == "portal" &&
                    consent.Status == "granted" &&
                    (consent.ExpiresAt == null || consent.ExpiresAt > now)) &&
                dbContext.PatientConsents.Any(consent =>
                    consent.PatientId == checkIn.PatientId &&
                    consent.ProfessionalId == checkIn.ProfessionalId &&
                    consent.ConsentType == "checkins" &&
                    consent.Status == "granted" &&
                    (consent.ExpiresAt == null || consent.ExpiresAt > now)))
            .OrderBy(checkIn => checkIn.Status == "answered")
            .ThenBy(checkIn => checkIn.DueAt == null)
            .ThenBy(checkIn => checkIn.DueAt)
            .ThenByDescending(checkIn => checkIn.SharedAt ?? checkIn.CreatedAt)
            .Take(50)
            .ToListAsync(cancellationToken);

        var auditedSpaceIds = tasks
            .Select(task => task.SpaceId)
            .Concat(materials.Select(material => material.SpaceId))
            .Concat(checkIns.Select(checkIn => checkIn.SpaceId))
            .Concat(consentRelationships.Select(relationship => relationship.SpaceId))
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
            materials.Select(ToDto).ToList(),
            checkIns.Select(ToDto).ToList(),
            consents);
    }

    public async Task<PatientTaskDto> CompletePatientTaskAsync(
        Guid patientUserId,
        Guid taskId,
        CompletePatientTaskRequest request,
        CancellationToken cancellationToken)
    {
        await EnsurePatientUserAsync(patientUserId, cancellationToken);
        var task = await dbContext.PatientTasks
            .FirstOrDefaultAsync(item => item.Id == taskId && item.PatientId == patientUserId, cancellationToken);

        if (task is null)
        {
            throw new KeyNotFoundException("Tarefa não encontrada no seu acompanhamento.");
        }

        if (task.Status != "shared")
        {
            throw new InvalidOperationException("Apenas tarefas abertas e compartilhadas podem ser concluídas pelo portal.");
        }

        await EnsureConsentGrantedAsync(
            task.PatientId,
            task.ProfessionalId,
            "portal",
            "Concluir tarefa exige consentimento ativo para o portal do paciente.",
            cancellationToken);

        var responseText = NormalizeOptionalText(request.ResponseText, 2000, "Resposta da tarefa");
        if (!task.AcceptsResponse && responseText is not null)
        {
            throw new InvalidOperationException("Esta tarefa não aceita resposta textual.");
        }

        var now = DateTimeOffset.UtcNow;
        task.Status = "completed";
        task.ResponseText = responseText;
        task.ResponseSubmittedAt = responseText is null ? null : now;
        task.CompletedAt = now;
        task.UpdatedAt = now;

        dbContext.PatientTimelineItems.Add(new PatientTimelineItem
        {
            AppointmentId = task.AppointmentId,
            PatientId = task.PatientId,
            ProfessionalId = task.ProfessionalId,
            SpaceId = task.SpaceId,
            CreatedByUserId = patientUserId,
            SourceType = "task_response",
            SourceId = task.Id,
            Title = responseText is null ? "Tarefa concluída pelo paciente" : "Resposta de tarefa recebida",
            Summary = responseText is null
                ? "Paciente marcou a tarefa como concluída no portal."
                : "Paciente concluiu a tarefa e enviou uma resposta para revisão da psicóloga.",
            Layer = "memoria",
            OccurredAt = now,
            CreatedAt = now
        });
        await AddClinicalAuditAsync(
            patientUserId,
            task.SpaceId,
            "patient.task.completed",
            nameof(PatientTask),
            task.Id,
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(task);
    }

    public async Task<PatientCheckInDto> RespondPatientCheckInAsync(
        Guid patientUserId,
        Guid checkInId,
        RespondPatientCheckInRequest request,
        CancellationToken cancellationToken)
    {
        await EnsurePatientUserAsync(patientUserId, cancellationToken);
        var checkIn = await dbContext.PatientCheckIns
            .FirstOrDefaultAsync(item => item.Id == checkInId && item.PatientId == patientUserId, cancellationToken);

        if (checkIn is null)
        {
            throw new KeyNotFoundException("Check-in não encontrado no seu acompanhamento.");
        }

        if (checkIn.Status != "shared")
        {
            throw new InvalidOperationException("Apenas check-ins abertos podem receber resposta pelo portal.");
        }

        if (request.MoodScore is < 1 or > 5)
        {
            throw new InvalidOperationException("O check-in precisa de uma escala entre 1 e 5.");
        }

        await EnsureConsentGrantedAsync(
            checkIn.PatientId,
            checkIn.ProfessionalId,
            "portal",
            "Responder check-in exige consentimento ativo para o portal do paciente.",
            cancellationToken);
        await EnsureConsentGrantedAsync(
            checkIn.PatientId,
            checkIn.ProfessionalId,
            "checkins",
            "Responder check-in exige consentimento ativo para check-ins.",
            cancellationToken);

        var responseText = NormalizeOptionalText(request.ResponseText, 2000, "Resposta do check-in");
        var now = DateTimeOffset.UtcNow;
        checkIn.Status = "answered";
        checkIn.MoodScore = request.MoodScore;
        checkIn.ResponseText = responseText;
        checkIn.RespondedAt = now;
        checkIn.UpdatedAt = now;

        dbContext.PatientTimelineItems.Add(new PatientTimelineItem
        {
            AppointmentId = checkIn.AppointmentId,
            PatientId = checkIn.PatientId,
            ProfessionalId = checkIn.ProfessionalId,
            SpaceId = checkIn.SpaceId,
            CreatedByUserId = patientUserId,
            SourceType = "checkin_response",
            SourceId = checkIn.Id,
            Title = "Check-in respondido",
            Summary = "Paciente respondeu um check-in de acompanhamento para revisão da psicóloga.",
            Layer = "memoria",
            OccurredAt = now,
            CreatedAt = now
        });
        await AddClinicalAuditAsync(
            patientUserId,
            checkIn.SpaceId,
            "patient.checkin.responded",
            nameof(PatientCheckIn),
            checkIn.Id,
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(checkIn);
    }

    public async Task<PatientPortalConsentDto> UpdatePatientPortalConsentAsync(
        Guid patientUserId,
        Guid professionalId,
        string consentType,
        UpdatePatientConsentRequest request,
        CancellationToken cancellationToken)
    {
        await EnsurePatientUserAsync(patientUserId, cancellationToken);
        var normalizedType = ValidatePatientPortalConsentType(consentType);
        var normalizedStatus = ValidateConsentStatus(request.Status);

        if (normalizedStatus is not ("granted" or "revoked"))
        {
            throw new InvalidOperationException("O portal do paciente permite conceder ou revogar este consentimento.");
        }

        var relationship = await GetPatientConsentRelationshipAsync(patientUserId, professionalId, cancellationToken);
        if (relationship is null)
        {
            throw new KeyNotFoundException("Profissional não encontrada no seu acompanhamento.");
        }

        var termsVersion = NormalizeOptionalText(request.TermsVersion, 40, "Versão dos termos") ?? "clinical-consent-v1";
        var now = DateTimeOffset.UtcNow;
        var consent = await dbContext.PatientConsents
            .FirstOrDefaultAsync(item =>
                    item.PatientId == patientUserId &&
                    item.ProfessionalId == relationship.ProfessionalId &&
                    item.ConsentType == normalizedType,
                cancellationToken);

        if (consent is null)
        {
            consent = new PatientConsent
            {
                PatientId = patientUserId,
                ProfessionalId = relationship.ProfessionalId,
                SpaceId = relationship.SpaceId,
                UpdatedByUserId = patientUserId,
                ConsentType = normalizedType,
                Status = normalizedStatus,
                TermsVersion = termsVersion,
                CreatedAt = now,
                UpdatedAt = now
            };
            dbContext.PatientConsents.Add(consent);
        }

        consent.SpaceId = relationship.SpaceId;
        consent.Status = normalizedStatus;
        consent.TermsVersion = termsVersion;
        consent.UpdatedByUserId = patientUserId;
        consent.UpdatedAt = now;
        consent.ExpiresAt = normalizedStatus == "granted" ? request.ExpiresAt : null;

        if (normalizedStatus == "granted")
        {
            consent.GrantedAt = now;
            consent.RevokedAt = null;
        }
        else
        {
            consent.RevokedAt = now;
        }

        dbContext.PatientTimelineItems.Add(new PatientTimelineItem
        {
            PatientId = patientUserId,
            ProfessionalId = relationship.ProfessionalId,
            SpaceId = relationship.SpaceId,
            CreatedByUserId = patientUserId,
            SourceType = "consent",
            SourceId = consent.Id,
            Title = "Consentimento atualizado pelo paciente",
            Summary = $"Paciente atualizou consentimento para {ConsentTypeLabel(normalizedType)}: {ConsentStatusLabel(normalizedStatus)}.",
            Layer = "memoria",
            OccurredAt = now,
            CreatedAt = now
        });
        await AddClinicalAuditAsync(
            patientUserId,
            relationship.SpaceId,
            "patient.consent.updated",
            nameof(PatientConsent),
            consent.Id,
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToPortalDto(consent, relationship.ProfessionalName, relationship.SpaceName);
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

    public async Task<PatientCheckInDto> CreateAppointmentCheckInAsync(
        Guid professionalUserId,
        Guid appointmentId,
        CreatePatientCheckInRequest request,
        CancellationToken cancellationToken)
    {
        var appointment = await EnsureProfessionalAppointmentAsync(professionalUserId, appointmentId, cancellationToken);
        var now = DateTimeOffset.UtcNow;
        var checkIn = new PatientCheckIn
        {
            AppointmentId = appointment.Id,
            PatientId = appointment.CustomerId,
            ProfessionalId = appointment.ProfessionalId,
            SpaceId = appointment.SpaceId,
            CreatedByUserId = professionalUserId,
            Prompt = ValidateText(request.Prompt, "Pergunta do check-in", 3, 220),
            ContextNote = NormalizeOptionalText(request.ContextNote, 1000, "Contexto do check-in"),
            DueAt = NormalizeFutureDate(request.DueAt, "Prazo do check-in"),
            Status = "private",
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.PatientCheckIns.Add(checkIn);
        dbContext.PatientTimelineItems.Add(new PatientTimelineItem
        {
            AppointmentId = appointment.Id,
            PatientId = appointment.CustomerId,
            ProfessionalId = appointment.ProfessionalId,
            SpaceId = appointment.SpaceId,
            CreatedByUserId = professionalUserId,
            SourceType = "checkin",
            SourceId = checkIn.Id,
            Title = "Check-in privado criado",
            Summary = "Check-in preparado pela psicóloga. Ainda não foi compartilhado com o paciente.",
            Layer = "memoria",
            OccurredAt = now,
            CreatedAt = now
        });
        await AddClinicalAuditAsync(
            professionalUserId,
            appointment.SpaceId,
            "clinical.checkin.created",
            nameof(PatientCheckIn),
            checkIn.Id,
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(checkIn);
    }

    public async Task<PatientCheckInDto> ShareCheckInAsync(
        Guid professionalUserId,
        Guid checkInId,
        CancellationToken cancellationToken)
    {
        var professional = await GetLinkedProfessionalAsync(professionalUserId, cancellationToken);
        var checkIn = await dbContext.PatientCheckIns
            .FirstOrDefaultAsync(item => item.Id == checkInId, cancellationToken);

        if (checkIn is null || checkIn.ProfessionalId != professional.Id)
        {
            throw new KeyNotFoundException("Check-in clínico não encontrado.");
        }

        EnsureCheckInCanChange(checkIn.Status);
        await EnsureConsentGrantedAsync(checkIn.PatientId, checkIn.ProfessionalId, "portal", "Compartilhar check-in exige consentimento ativo para o portal do paciente.", cancellationToken);
        await EnsureConsentGrantedAsync(checkIn.PatientId, checkIn.ProfessionalId, "checkins", "Compartilhar check-in exige consentimento ativo para check-ins.", cancellationToken);

        var now = DateTimeOffset.UtcNow;
        checkIn.Status = "shared";
        checkIn.SharedAt ??= now;
        checkIn.UpdatedAt = now;

        dbContext.PatientTimelineItems.Add(new PatientTimelineItem
        {
            AppointmentId = checkIn.AppointmentId,
            PatientId = checkIn.PatientId,
            ProfessionalId = checkIn.ProfessionalId,
            SpaceId = checkIn.SpaceId,
            CreatedByUserId = professionalUserId,
            SourceType = "checkin",
            SourceId = checkIn.Id,
            Title = "Check-in compartilhado",
            Summary = "Check-in liberado pela psicóloga para resposta do paciente no portal.",
            Layer = "compartilhado",
            OccurredAt = now,
            CreatedAt = now
        });
        await AddClinicalAuditAsync(
            professionalUserId,
            checkIn.SpaceId,
            "clinical.checkin.shared",
            nameof(PatientCheckIn),
            checkIn.Id,
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(checkIn);
    }

    public async Task<PatientCheckInDto> UnshareCheckInAsync(
        Guid professionalUserId,
        Guid checkInId,
        CancellationToken cancellationToken)
    {
        var professional = await GetLinkedProfessionalAsync(professionalUserId, cancellationToken);
        var checkIn = await dbContext.PatientCheckIns
            .FirstOrDefaultAsync(item => item.Id == checkInId, cancellationToken);

        if (checkIn is null || checkIn.ProfessionalId != professional.Id)
        {
            throw new KeyNotFoundException("Check-in clínico não encontrado.");
        }

        EnsureCheckInCanChange(checkIn.Status);
        var now = DateTimeOffset.UtcNow;
        checkIn.Status = "private";
        checkIn.SharedAt = null;
        checkIn.UpdatedAt = now;

        dbContext.PatientTimelineItems.Add(new PatientTimelineItem
        {
            AppointmentId = checkIn.AppointmentId,
            PatientId = checkIn.PatientId,
            ProfessionalId = checkIn.ProfessionalId,
            SpaceId = checkIn.SpaceId,
            CreatedByUserId = professionalUserId,
            SourceType = "checkin",
            SourceId = checkIn.Id,
            Title = "Check-in recolhido",
            Summary = "Check-in deixou de ficar disponível no portal do paciente.",
            Layer = "memoria",
            OccurredAt = now,
            CreatedAt = now
        });
        await AddClinicalAuditAsync(
            professionalUserId,
            checkIn.SpaceId,
            "clinical.checkin.unshared",
            nameof(PatientCheckIn),
            checkIn.Id,
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(checkIn);
    }

    public async Task<ClinicalAlertDto> CreateAppointmentAlertAsync(
        Guid professionalUserId,
        Guid appointmentId,
        CreateClinicalAlertRequest request,
        CancellationToken cancellationToken)
    {
        var appointment = await EnsureProfessionalAppointmentAsync(professionalUserId, appointmentId, cancellationToken);
        var severity = ValidateAlertSeverity(request.Severity);
        var now = DateTimeOffset.UtcNow;
        var alert = new ClinicalAlert
        {
            AppointmentId = appointment.Id,
            PatientId = appointment.CustomerId,
            ProfessionalId = appointment.ProfessionalId,
            SpaceId = appointment.SpaceId,
            CreatedByUserId = professionalUserId,
            SourceType = "manual",
            Title = ValidateText(request.Title, "Título do alerta", 5, 160),
            Description = ValidateText(request.Description, "Motivo do alerta", 5, 1200),
            Severity = severity,
            Status = "pending",
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.ClinicalAlerts.Add(alert);
        dbContext.PatientTimelineItems.Add(new PatientTimelineItem
        {
            AppointmentId = appointment.Id,
            PatientId = appointment.CustomerId,
            ProfessionalId = appointment.ProfessionalId,
            SpaceId = appointment.SpaceId,
            CreatedByUserId = professionalUserId,
            SourceType = "alert",
            SourceId = alert.Id,
            Title = "Alerta responsável registrado",
            Summary = $"Possível ponto de atenção criado para revisão da psicóloga. Nível: {AlertSeverityLabel(severity)}. Não é diagnóstico.",
            Layer = "memoria",
            OccurredAt = now,
            CreatedAt = now
        });
        await AddClinicalAuditAsync(
            professionalUserId,
            appointment.SpaceId,
            "clinical.alert.created",
            nameof(ClinicalAlert),
            alert.Id,
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(alert);
    }

    public async Task<ClinicalAlertDto> ReviewAlertAsync(
        Guid professionalUserId,
        Guid alertId,
        string status,
        ReviewClinicalAlertRequest request,
        CancellationToken cancellationToken)
    {
        var professional = await GetLinkedProfessionalAsync(professionalUserId, cancellationToken);
        var alert = await dbContext.ClinicalAlerts
            .FirstOrDefaultAsync(item =>
                    item.Id == alertId &&
                    item.ProfessionalId == professional.Id,
                cancellationToken);

        if (alert is null)
        {
            throw new KeyNotFoundException("Alerta clínico não encontrado.");
        }

        await EnsureProfessionalPatientRelationshipAsync(professionalUserId, alert.PatientId, cancellationToken);

        var normalizedStatus = ValidateAlertStatus(status);
        if (normalizedStatus == "pending")
        {
            throw new InvalidOperationException("Use uma decisão de revisão: confirmar, descartar, acompanhar ou resolver.");
        }

        var now = DateTimeOffset.UtcNow;
        alert.Status = normalizedStatus;
        alert.ReviewedByUserId = professionalUserId;
        alert.ReviewedAt = now;
        alert.ResolvedAt = normalizedStatus == "resolved" ? now : null;
        alert.ReviewNote = NormalizeOptionalText(request.ReviewNote, 500, "Nota de revisão do alerta");
        alert.UpdatedAt = now;

        dbContext.PatientTimelineItems.Add(new PatientTimelineItem
        {
            AppointmentId = alert.AppointmentId,
            PatientId = alert.PatientId,
            ProfessionalId = alert.ProfessionalId,
            SpaceId = alert.SpaceId,
            CreatedByUserId = professionalUserId,
            SourceType = "alert",
            SourceId = alert.Id,
            Title = "Alerta responsável revisado",
            Summary = $"Psicóloga marcou o alerta como {AlertStatusLabel(normalizedStatus)}. Nenhuma mensagem automática foi enviada ao paciente.",
            Layer = "memoria",
            OccurredAt = now,
            CreatedAt = now
        });
        await AddClinicalAuditAsync(
            professionalUserId,
            alert.SpaceId,
            $"clinical.alert.{normalizedStatus}",
            nameof(ClinicalAlert),
            alert.Id,
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(alert);
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

    private async Task<IReadOnlyList<PatientConsentRelationship>> GetPatientConsentRelationshipsAsync(
        Guid patientUserId,
        CancellationToken cancellationToken)
    {
        var rows = await dbContext.Appointments
            .AsNoTracking()
            .Where(appointment =>
                appointment.CustomerId == patientUserId &&
                appointment.Status != AppointmentStatus.Expired &&
                appointment.Status != AppointmentStatus.Rejected)
            .Join(
                dbContext.Professionals.AsNoTracking(),
                appointment => appointment.ProfessionalId,
                professional => professional.Id,
                (appointment, professional) => new { appointment, professional })
            .Join(
                dbContext.Spaces.AsNoTracking(),
                item => item.appointment.SpaceId,
                space => space.Id,
                (item, space) => new
                {
                    item.appointment.ProfessionalId,
                    item.appointment.SpaceId,
                    item.appointment.StartDateTime,
                    ProfessionalName = item.professional.Name,
                    SpaceName = space.Name
                })
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(row => new { row.ProfessionalId, row.SpaceId })
            .Select(group =>
            {
                var row = group.OrderByDescending(item => item.StartDateTime).First();

                return new PatientConsentRelationship(
                    row.ProfessionalId,
                    row.SpaceId,
                    row.ProfessionalName,
                    row.SpaceName);
            })
            .OrderBy(relationship => relationship.ProfessionalName)
            .ThenBy(relationship => relationship.SpaceName)
            .ToList();
    }

    private async Task<IReadOnlyList<PatientPortalConsentDto>> GetPatientPortalConsentsAsync(
        Guid patientUserId,
        IReadOnlyList<PatientConsentRelationship> relationships,
        CancellationToken cancellationToken)
    {
        if (relationships.Count == 0)
        {
            return [];
        }

        var professionalIds = relationships
            .Select(relationship => relationship.ProfessionalId)
            .Distinct()
            .ToList();
        var consentTypes = PatientPortalConsentTypes.ToArray();
        var stored = await dbContext.PatientConsents
            .AsNoTracking()
            .Where(consent =>
                consent.PatientId == patientUserId &&
                professionalIds.Contains(consent.ProfessionalId) &&
                consentTypes.Contains(consent.ConsentType))
            .ToListAsync(cancellationToken);
        var byProfessionalAndType = stored.ToDictionary(
            consent => PatientPortalConsentKey(consent.ProfessionalId, consent.ConsentType),
            StringComparer.OrdinalIgnoreCase);

        return relationships
            .SelectMany(relationship => PatientPortalConsentTypes.Select(type =>
                byProfessionalAndType.TryGetValue(PatientPortalConsentKey(relationship.ProfessionalId, type), out var consent)
                    ? ToPortalDto(consent, relationship.ProfessionalName, relationship.SpaceName)
                    : new PatientPortalConsentDto(
                        null,
                        patientUserId,
                        relationship.ProfessionalId,
                        relationship.SpaceId,
                        relationship.ProfessionalName,
                        relationship.SpaceName,
                        type,
                        "pending",
                        "clinical-consent-v1",
                        null,
                        null,
                        null,
                        null)))
            .ToList();
    }

    private async Task<PatientConsentRelationship?> GetPatientConsentRelationshipAsync(
        Guid patientUserId,
        Guid professionalId,
        CancellationToken cancellationToken)
    {
        var row = await dbContext.Appointments
            .AsNoTracking()
            .Where(appointment =>
                appointment.CustomerId == patientUserId &&
                appointment.ProfessionalId == professionalId &&
                appointment.Status != AppointmentStatus.Expired &&
                appointment.Status != AppointmentStatus.Rejected)
            .Join(
                dbContext.Professionals.AsNoTracking(),
                appointment => appointment.ProfessionalId,
                professional => professional.Id,
                (appointment, professional) => new { appointment, professional })
            .Join(
                dbContext.Spaces.AsNoTracking(),
                item => item.appointment.SpaceId,
                space => space.Id,
                (item, space) => new
                {
                    item.appointment.ProfessionalId,
                    item.appointment.SpaceId,
                    item.appointment.StartDateTime,
                    ProfessionalName = item.professional.Name,
                    SpaceName = space.Name
                })
            .OrderByDescending(item => item.StartDateTime)
            .FirstOrDefaultAsync(cancellationToken);

        return row is null
            ? null
            : new PatientConsentRelationship(
                row.ProfessionalId,
                row.SpaceId,
                row.ProfessionalName,
                row.SpaceName);
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

    private async Task<ProfessionalPatientRelationship> EnsureProfessionalPatientRelationshipAsync(
        Guid professionalUserId,
        Guid patientId,
        CancellationToken cancellationToken)
    {
        var professional = await GetLinkedProfessionalAsync(professionalUserId, cancellationToken);
        var appointment = await dbContext.Appointments
            .AsNoTracking()
            .Where(item =>
                item.CustomerId == patientId &&
                item.ProfessionalId == professional.Id &&
                item.Status != AppointmentStatus.Expired &&
                item.Status != AppointmentStatus.Rejected)
            .OrderByDescending(item => item.StartDateTime)
            .FirstOrDefaultAsync(cancellationToken);

        if (appointment is null)
        {
            throw new KeyNotFoundException("Paciente clínico não encontrado para esta profissional.");
        }

        return new ProfessionalPatientRelationship(
            professional.Id,
            appointment.SpaceId);
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

    private async Task<PatientTimelineItemDetailDto> BuildTimelineItemDetailDtoAsync(
        PatientTimelineItem item,
        CancellationToken cancellationToken)
    {
        var appointment = item.AppointmentId is null
            ? null
            : await dbContext.Appointments
                .AsNoTracking()
                .Where(appointmentItem =>
                    appointmentItem.Id == item.AppointmentId.Value &&
                    appointmentItem.CustomerId == item.PatientId &&
                    appointmentItem.ProfessionalId == item.ProfessionalId &&
                    appointmentItem.SpaceId == item.SpaceId)
                .Select(appointmentItem => new
                {
                    appointmentItem.Code,
                    appointmentItem.StartDateTime
                })
                .FirstOrDefaultAsync(cancellationToken);
        var source = await GetTimelineSourceMetadataAsync(item, cancellationToken);

        return new PatientTimelineItemDetailDto(
            ToSafeTimelineDetailDto(item),
            appointment?.Code,
            appointment?.StartDateTime,
            source.SourceLabel,
            source.SourceStatus,
            source.SourceTypeDetail,
            source.SourceVersion,
            source.CanOpenSource,
            CanArchiveTimelineItem(item),
            BuildTimelineAccessNote(item));
    }

    private async Task<TimelineSourceMetadata> GetTimelineSourceMetadataAsync(
        PatientTimelineItem item,
        CancellationToken cancellationToken)
    {
        if (item.SourceId is null)
        {
            return new TimelineSourceMetadata(
                TimelineSourceLabel(item.SourceType),
                null,
                null,
                null,
                false);
        }

        return item.SourceType switch
        {
            "draft" => await dbContext.ClinicalDrafts
                .AsNoTracking()
                .Where(draft =>
                    draft.Id == item.SourceId.Value &&
                    draft.PatientId == item.PatientId &&
                    draft.ProfessionalId == item.ProfessionalId)
                .Select(draft => new TimelineSourceMetadata(
                    "Rascunho clínico",
                    draft.Status,
                    draft.RecordType,
                    null,
                    true))
                .FirstOrDefaultAsync(cancellationToken) ?? MissingTimelineSource(item.SourceType),
            "record" => await dbContext.ClinicalRecords
                .AsNoTracking()
                .Where(record =>
                    record.Id == item.SourceId.Value &&
                    record.PatientId == item.PatientId &&
                    record.ProfessionalId == item.ProfessionalId)
                .Select(record => new TimelineSourceMetadata(
                    "Prontuário aprovado",
                    record.Status,
                    record.RecordType,
                    record.Version,
                    true))
                .FirstOrDefaultAsync(cancellationToken) ?? MissingTimelineSource(item.SourceType),
            "session" => await dbContext.ClinicalSessions
                .AsNoTracking()
                .Where(session =>
                    session.Id == item.SourceId.Value &&
                    session.PatientId == item.PatientId &&
                    session.ProfessionalId == item.ProfessionalId)
                .Select(session => new TimelineSourceMetadata(
                    "Sessão clínica",
                    session.Status,
                    session.SessionType,
                    null,
                    true))
                .FirstOrDefaultAsync(cancellationToken) ?? MissingTimelineSource(item.SourceType),
            "tag" => await GetTagTimelineSourceMetadataAsync(item, cancellationToken),
            "consent" => await dbContext.PatientConsents
                .AsNoTracking()
                .Where(consent =>
                    consent.Id == item.SourceId.Value &&
                    consent.PatientId == item.PatientId &&
                    consent.ProfessionalId == item.ProfessionalId)
                .Select(consent => new TimelineSourceMetadata(
                    "Consentimento",
                    consent.Status,
                    consent.ConsentType,
                    null,
                    true))
                .FirstOrDefaultAsync(cancellationToken) ?? MissingTimelineSource(item.SourceType),
            "plan_update" => await dbContext.TreatmentPlans
                .AsNoTracking()
                .Where(plan =>
                    plan.Id == item.SourceId.Value &&
                    plan.PatientId == item.PatientId &&
                    plan.ProfessionalId == item.ProfessionalId)
                .Select(plan => new TimelineSourceMetadata(
                    "Plano terapêutico",
                    plan.Status,
                    null,
                    null,
                    true))
                .FirstOrDefaultAsync(cancellationToken) ?? MissingTimelineSource(item.SourceType),
            "task" or "task_response" => await dbContext.PatientTasks
                .AsNoTracking()
                .Where(task =>
                    task.Id == item.SourceId.Value &&
                    task.PatientId == item.PatientId &&
                    task.ProfessionalId == item.ProfessionalId)
                .Select(task => new TimelineSourceMetadata(
                    item.SourceType == "task_response" ? "Resposta de tarefa" : "Tarefa",
                    task.Status,
                    task.AcceptsResponse ? "aceita resposta" : "sem resposta textual",
                    null,
                    true))
                .FirstOrDefaultAsync(cancellationToken) ?? MissingTimelineSource(item.SourceType),
            "material" => await dbContext.SharedMaterials
                .AsNoTracking()
                .Where(material =>
                    material.Id == item.SourceId.Value &&
                    material.PatientId == item.PatientId &&
                    material.ProfessionalId == item.ProfessionalId)
                .Select(material => new TimelineSourceMetadata(
                    "Material compartilhável",
                    material.Status,
                    material.MaterialType,
                    null,
                    true))
                .FirstOrDefaultAsync(cancellationToken) ?? MissingTimelineSource(item.SourceType),
            "checkin" or "checkin_response" => await dbContext.PatientCheckIns
                .AsNoTracking()
                .Where(checkIn =>
                    checkIn.Id == item.SourceId.Value &&
                    checkIn.PatientId == item.PatientId &&
                    checkIn.ProfessionalId == item.ProfessionalId)
                .Select(checkIn => new TimelineSourceMetadata(
                    item.SourceType == "checkin_response" ? "Resposta de check-in" : "Check-in",
                    checkIn.Status,
                    null,
                    null,
                    true))
                .FirstOrDefaultAsync(cancellationToken) ?? MissingTimelineSource(item.SourceType),
            "alert" => await dbContext.ClinicalAlerts
                .AsNoTracking()
                .Where(alert =>
                    alert.Id == item.SourceId.Value &&
                    alert.PatientId == item.PatientId &&
                    alert.ProfessionalId == item.ProfessionalId)
                .Select(alert => new TimelineSourceMetadata(
                    "Alerta responsável",
                    alert.Status,
                    alert.Severity,
                    null,
                    true))
                .FirstOrDefaultAsync(cancellationToken) ?? MissingTimelineSource(item.SourceType),
            _ => new TimelineSourceMetadata(
                TimelineSourceLabel(item.SourceType),
                null,
                null,
                null,
                false)
        };
    }

    private async Task<TimelineSourceMetadata> GetTagTimelineSourceMetadataAsync(
        PatientTimelineItem item,
        CancellationToken cancellationToken)
    {
        if (item.SourceId is not Guid sourceId)
        {
            return MissingTimelineSource(item.SourceType);
        }

        var tagsCount = await dbContext.AppliedClinicalTags
            .AsNoTracking()
            .CountAsync(tag =>
                    tag.AppointmentId == sourceId &&
                    tag.PatientId == item.PatientId &&
                    tag.ProfessionalId == item.ProfessionalId,
                cancellationToken);

        return tagsCount == 0
            ? MissingTimelineSource(item.SourceType)
            : new TimelineSourceMetadata(
                "Tags clínicas",
                null,
                tagsCount == 1 ? "1 tag aplicada" : $"{tagsCount} tags aplicadas",
                null,
                true);
    }

    private static TimelineSourceMetadata MissingTimelineSource(string sourceType)
    {
        return new TimelineSourceMetadata(
            TimelineSourceLabel(sourceType),
            null,
            "origem não localizada",
            null,
            false);
    }

    private static string TimelineSourceLabel(string sourceType)
    {
        return sourceType switch
        {
            "session" => "Sessão clínica",
            "draft" => "Rascunho clínico",
            "record" => "Prontuário aprovado",
            "tag" => "Tags clínicas",
            "consent" => "Consentimento",
            "plan_update" => "Plano terapêutico",
            "task" => "Tarefa",
            "task_response" => "Resposta de tarefa",
            "material" => "Material compartilhável",
            "checkin" => "Check-in",
            "checkin_response" => "Resposta de check-in",
            "alert" => "Alerta responsável",
            _ => sourceType
        };
    }

    private static string BuildTimelineAccessNote(PatientTimelineItem item)
    {
        if (item.Archived)
        {
            return "Evento arquivado pela psicóloga. Ele saiu da timeline ativa, mas permanece preservado para rastreabilidade clínica.";
        }

        return item.Layer switch
        {
            "prontuario" => "Evento de prontuário aprovado. A timeline não edita nem arquiva esse conteúdo; use retificação formal quando necessário.",
            "rascunho" => "Evento de rascunho clínico. Revise no módulo de rascunhos antes de qualquer aprovação como prontuário.",
            "compartilhado" => "Evento compartilhável. A disponibilidade ao paciente depende da ação explícita da psicóloga e dos consentimentos ativos.",
            _ => "Evento de memória clínica privada. O portal do paciente não exibe esta timeline interna."
        };
    }

    private static bool CanArchiveTimelineItem(PatientTimelineItem item)
    {
        return !item.Archived && item.Layer != "prontuario" && item.SourceType != "record";
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

    private static string ValidatePatientPortalConsentType(string consentType)
    {
        var normalized = string.IsNullOrWhiteSpace(consentType) ? string.Empty : consentType.Trim().ToLowerInvariant();

        if (!AllowedPatientPortalConsentTypes.Contains(normalized))
        {
            throw new InvalidOperationException("Este consentimento não pode ser atualizado diretamente pelo portal do paciente.");
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

    private static void EnsureCheckInCanChange(string status)
    {
        if (!AllowedCheckInStatuses.Contains(status))
        {
            throw new InvalidOperationException("Check-in tem status inválido.");
        }

        if (status is "answered" or "archived")
        {
            throw new InvalidOperationException("Check-in respondido ou arquivado não pode mudar o compartilhamento.");
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

    private static string ValidateAlertSeverity(string severity)
    {
        var normalized = string.IsNullOrWhiteSpace(severity)
            ? "medio"
            : severity.Trim().ToLowerInvariant();

        if (!AllowedAlertSeverities.Contains(normalized))
        {
            throw new InvalidOperationException("Nível do alerta inválido.");
        }

        return normalized;
    }

    private static string ValidateAlertStatus(string status)
    {
        var normalized = string.IsNullOrWhiteSpace(status)
            ? "pending"
            : status.Trim().ToLowerInvariant();

        if (!AllowedAlertStatuses.Contains(normalized))
        {
            throw new InvalidOperationException("Status do alerta inválido.");
        }

        return normalized;
    }

    private static string AlertSeverityLabel(string severity)
    {
        return severity switch
        {
            "alto" => "alto",
            "medio" => "médio",
            _ => "baixo"
        };
    }

    private static string AlertStatusLabel(string status)
    {
        return status switch
        {
            "confirmed" => "confirmado",
            "dismissed" => "descartado",
            "monitoring" => "em acompanhamento",
            "resolved" => "resolvido",
            _ => "pendente"
        };
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

    private static string? NormalizeTimelineSourceType(string? sourceType)
    {
        return NormalizeOptionalText(sourceType, 80, "Origem da timeline")?.ToLowerInvariant();
    }

    private static string? NormalizeTimelineLayer(string? layer)
    {
        var normalized = NormalizeOptionalText(layer, 40, "Camada da timeline")?.ToLowerInvariant();
        if (normalized is null)
        {
            return null;
        }

        if (!AllowedTimelineLayers.Contains(normalized))
        {
            throw new InvalidOperationException("Camada da timeline inválida.");
        }

        return normalized;
    }

    private static string? NormalizeTimelineTag(string? tag)
    {
        return NormalizeOptionalText(tag, 80, "Tag da timeline")?.ToLowerInvariant();
    }

    private static string? NormalizeTimelineSeverity(string? severity)
    {
        var normalized = NormalizeOptionalText(severity, 20, "Severidade da timeline")?.ToLowerInvariant();
        if (normalized is null)
        {
            return null;
        }

        if (!AllowedTagTones.Contains(normalized))
        {
            throw new InvalidOperationException("Severidade da timeline inválida.");
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

    private static string PatientPortalConsentKey(Guid professionalId, string consentType)
    {
        return $"{professionalId:N}:{consentType}";
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
            task.ResponseText,
            task.ResponseSubmittedAt,
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

    private static PatientCheckInDto ToDto(PatientCheckIn checkIn)
    {
        return new PatientCheckInDto(
            checkIn.Id,
            checkIn.AppointmentId,
            checkIn.PatientId,
            checkIn.ProfessionalId,
            checkIn.SpaceId,
            checkIn.Prompt,
            checkIn.ContextNote,
            checkIn.DueAt,
            checkIn.Status,
            checkIn.MoodScore,
            checkIn.ResponseText,
            checkIn.RespondedAt,
            checkIn.SharedAt,
            checkIn.CreatedAt,
            checkIn.UpdatedAt);
    }

    private static ClinicalAlertDto ToDto(ClinicalAlert alert)
    {
        return new ClinicalAlertDto(
            alert.Id,
            alert.AppointmentId,
            alert.PatientId,
            alert.ProfessionalId,
            alert.SpaceId,
            alert.SourceType,
            alert.SourceId,
            alert.Title,
            alert.Description,
            alert.Severity,
            alert.Status,
            alert.ReviewNote,
            alert.ReviewedAt,
            alert.ResolvedAt,
            alert.CreatedAt,
            alert.UpdatedAt);
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
            item.Archived,
            item.ArchivedAt,
            item.ArchiveReason,
            item.CreatedAt);
    }

    private static PatientTimelineItemDto ToSafeTimelineDetailDto(PatientTimelineItem item)
    {
        return ToDto(item) with { Summary = SafeTimelineDetailSummary(item) };
    }

    private static string SafeTimelineDetailSummary(PatientTimelineItem item)
    {
        return item.SourceType switch
        {
            "draft" => "Rascunho clínico criado. Revise o texto completo na seção de rascunhos antes de qualquer aprovação.",
            "tag" => "Tags clínicas atualizadas neste atendimento. Consulte a seção de tags para revisar os marcadores atuais.",
            "task_response" => "Paciente concluiu uma tarefa compartilhada. Revise a resposta na seção de tarefas.",
            "checkin_response" => "Paciente respondeu um check-in de acompanhamento. Revise a resposta na seção de check-ins.",
            "alert" => "Alerta responsável registrado para revisão humana. Abra a seção de alertas para ver motivo e decisão.",
            _ => item.Summary
        };
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

    private static PatientPortalConsentDto ToPortalDto(
        PatientConsent consent,
        string professionalName,
        string spaceName)
    {
        return new PatientPortalConsentDto(
            consent.Id,
            consent.PatientId,
            consent.ProfessionalId,
            consent.SpaceId,
            professionalName,
            spaceName,
            consent.ConsentType,
            consent.Status,
            consent.TermsVersion,
            consent.GrantedAt,
            consent.RevokedAt,
            consent.ExpiresAt,
            consent.UpdatedAt);
    }

    private sealed record PatientConsentRelationship(
        Guid ProfessionalId,
        Guid SpaceId,
        string ProfessionalName,
        string SpaceName);

    private sealed record ProfessionalPatientRelationship(
        Guid ProfessionalId,
        Guid SpaceId);

    private sealed record TimelineSourceMetadata(
        string SourceLabel,
        string? SourceStatus,
        string? SourceTypeDetail,
        int? SourceVersion,
        bool CanOpenSource);
}
