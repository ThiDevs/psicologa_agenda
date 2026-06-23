namespace PsiAgenda.Application.Clinical;

public sealed record ClinicalWorkspaceDto(
    Guid AppointmentId,
    Guid PatientId,
    Guid ProfessionalId,
    Guid SpaceId,
    ClinicalSessionDto Session,
    IReadOnlyList<ClinicalDraftDto> Drafts,
    IReadOnlyList<ClinicalRecordDto> Records,
    IReadOnlyList<AppliedClinicalTagDto> Tags,
    IReadOnlyList<PatientConsentDto> Consents,
    IReadOnlyList<PatientTimelineItemDto> Timeline);

public sealed record ClinicalSessionDto(
    Guid Id,
    Guid? AppointmentId,
    Guid PatientId,
    Guid ProfessionalId,
    Guid SpaceId,
    string SessionType,
    string Status,
    DateTimeOffset? StartedAt,
    DateTimeOffset? EndedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record ClinicalDraftDto(
    Guid Id,
    Guid? AppointmentId,
    Guid PatientId,
    Guid ProfessionalId,
    Guid SpaceId,
    string Status,
    string Source,
    string RecordType,
    Guid? PreviousRecordId,
    string? SessionNote,
    string ContentText,
    IReadOnlyList<ClinicalTagInput> Tags,
    bool AiGenerated,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public sealed record AppliedClinicalTagDto(
    Guid Id,
    Guid? AppointmentId,
    Guid PatientId,
    Guid ProfessionalId,
    Guid SpaceId,
    string Label,
    string Tone,
    string? Note,
    DateTimeOffset AppliedAt);

public sealed record ClinicalRecordDto(
    Guid Id,
    Guid? AppointmentId,
    Guid? DraftId,
    Guid PatientId,
    Guid ProfessionalId,
    Guid SpaceId,
    string RecordType,
    string Status,
    string ContentText,
    IReadOnlyList<ClinicalTagInput> Tags,
    int Version,
    Guid? PreviousRecordId,
    DateTimeOffset ApprovedAt,
    DateTimeOffset CreatedAt);

public sealed record PatientTimelineItemDto(
    Guid Id,
    Guid? AppointmentId,
    Guid PatientId,
    Guid ProfessionalId,
    Guid SpaceId,
    string SourceType,
    Guid? SourceId,
    string Title,
    string Summary,
    string Layer,
    DateTimeOffset OccurredAt,
    DateTimeOffset CreatedAt);

public sealed record PatientConsentDto(
    Guid? Id,
    Guid PatientId,
    Guid ProfessionalId,
    Guid SpaceId,
    string ConsentType,
    string Status,
    string TermsVersion,
    DateTimeOffset? GrantedAt,
    DateTimeOffset? RevokedAt,
    DateTimeOffset? ExpiresAt,
    DateTimeOffset? UpdatedAt);

public sealed record ClinicalTagInput(
    string Label,
    string Tone);

public sealed record CreateClinicalDraftRequest(
    string? SessionNote,
    string ContentText,
    IReadOnlyList<ClinicalTagInput> Tags);

public sealed record ApplyClinicalTagsRequest(
    IReadOnlyList<ClinicalTagInput> Tags,
    string? Note);

public sealed record ApproveClinicalDraftRequest(
    string? ContentText);

public sealed record UpdatePatientConsentRequest(
    string Status,
    string? TermsVersion,
    DateTimeOffset? ExpiresAt);

public interface IClinicalService
{
    Task<ClinicalWorkspaceDto> GetAppointmentWorkspaceAsync(Guid professionalUserId, Guid appointmentId, CancellationToken cancellationToken);
    Task<ClinicalDraftDto> CreateAppointmentDraftAsync(Guid professionalUserId, Guid appointmentId, CreateClinicalDraftRequest request, CancellationToken cancellationToken);
    Task<ClinicalDraftDto> CreateRecordRectificationDraftAsync(Guid professionalUserId, Guid recordId, CancellationToken cancellationToken);
    Task<IReadOnlyList<AppliedClinicalTagDto>> ApplyAppointmentTagsAsync(Guid professionalUserId, Guid appointmentId, ApplyClinicalTagsRequest request, CancellationToken cancellationToken);
    Task<ClinicalRecordDto> ApproveDraftAsync(Guid professionalUserId, Guid draftId, ApproveClinicalDraftRequest request, CancellationToken cancellationToken);
    Task<PatientConsentDto> UpdateAppointmentConsentAsync(Guid professionalUserId, Guid appointmentId, string consentType, UpdatePatientConsentRequest request, CancellationToken cancellationToken);
    Task<ClinicalSessionDto> StartAppointmentSessionAsync(Guid professionalUserId, Guid appointmentId, CancellationToken cancellationToken);
    Task<ClinicalSessionDto> CompleteAppointmentSessionAsync(Guid professionalUserId, Guid appointmentId, CancellationToken cancellationToken);
}
