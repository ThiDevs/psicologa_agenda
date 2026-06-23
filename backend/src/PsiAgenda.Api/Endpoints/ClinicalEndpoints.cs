using PsiAgenda.Application.Clinical;
using PsiAgenda.Application.Common;

namespace PsiAgenda.Api.Endpoints;

public static class ClinicalEndpoints
{
    public static IEndpointRouteBuilder MapClinicalEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/clinical")
            .WithTags("Clinical")
            .RequireAuthorization();

        group.MapGet("/appointments/{appointmentId:guid}/workspace", GetAppointmentWorkspaceAsync);
        group.MapPost("/appointments/{appointmentId:guid}/session/start", StartAppointmentSessionAsync)
            .RequireRateLimiting("Sensitive");
        group.MapPost("/appointments/{appointmentId:guid}/session/complete", CompleteAppointmentSessionAsync)
            .RequireRateLimiting("Sensitive");
        group.MapPost("/appointments/{appointmentId:guid}/drafts", CreateAppointmentDraftAsync)
            .RequireRateLimiting("Sensitive");
        group.MapPost("/appointments/{appointmentId:guid}/tags", ApplyAppointmentTagsAsync)
            .RequireRateLimiting("Sensitive");
        group.MapPost("/appointments/{appointmentId:guid}/consents/{consentType}", UpdateAppointmentConsentAsync)
            .RequireRateLimiting("Sensitive");
        group.MapPost("/appointments/{appointmentId:guid}/treatment-plan", UpdateAppointmentTreatmentPlanAsync)
            .RequireRateLimiting("Sensitive");
        group.MapPost("/appointments/{appointmentId:guid}/tasks", CreateAppointmentTaskAsync)
            .RequireRateLimiting("Sensitive");
        group.MapPost("/tasks/{taskId:guid}/share", ShareTaskAsync)
            .RequireRateLimiting("Sensitive");
        group.MapPost("/tasks/{taskId:guid}/unshare", UnshareTaskAsync)
            .RequireRateLimiting("Sensitive");
        group.MapPost("/appointments/{appointmentId:guid}/materials", CreateAppointmentMaterialAsync)
            .RequireRateLimiting("Sensitive");
        group.MapPost("/materials/{materialId:guid}/share", ShareMaterialAsync)
            .RequireRateLimiting("Sensitive");
        group.MapPost("/materials/{materialId:guid}/unshare", UnshareMaterialAsync)
            .RequireRateLimiting("Sensitive");
        group.MapPost("/appointments/{appointmentId:guid}/check-ins", CreateAppointmentCheckInAsync)
            .RequireRateLimiting("Sensitive");
        group.MapPost("/check-ins/{checkInId:guid}/share", ShareCheckInAsync)
            .RequireRateLimiting("Sensitive");
        group.MapPost("/check-ins/{checkInId:guid}/unshare", UnshareCheckInAsync)
            .RequireRateLimiting("Sensitive");
        group.MapPost("/drafts/{draftId:guid}/approve", ApproveDraftAsync)
            .RequireRateLimiting("Sensitive");
        group.MapPost("/records/{recordId:guid}/rectifications", CreateRecordRectificationDraftAsync)
            .RequireRateLimiting("Sensitive");

        app.MapGet("/api/patients/me/care", GetPatientCarePortalAsync)
            .WithTags("Clinical")
            .RequireAuthorization();
        app.MapPost("/api/patients/me/tasks/{taskId:guid}/complete", CompletePatientTaskAsync)
            .WithTags("Clinical")
            .RequireAuthorization()
            .RequireRateLimiting("Sensitive");
        app.MapPost("/api/patients/me/check-ins/{checkInId:guid}/respond", RespondPatientCheckInAsync)
            .WithTags("Clinical")
            .RequireAuthorization()
            .RequireRateLimiting("Sensitive");
        app.MapPost("/api/patients/me/consents/{professionalId:guid}/{consentType}", UpdatePatientPortalConsentAsync)
            .WithTags("Clinical")
            .RequireAuthorization()
            .RequireRateLimiting("Sensitive");

        return app;
    }

    private static async Task<IResult> GetAppointmentWorkspaceAsync(
        Guid appointmentId,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.GetAppointmentWorkspaceAsync(currentUser.UserIdOrThrow(), appointmentId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> GetPatientCarePortalAsync(
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.GetPatientCarePortalAsync(currentUser.UserIdOrThrow(), cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> CompletePatientTaskAsync(
        Guid taskId,
        CompletePatientTaskRequest request,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.CompletePatientTaskAsync(
                currentUser.UserIdOrThrow(),
                taskId,
                request,
                cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> RespondPatientCheckInAsync(
        Guid checkInId,
        RespondPatientCheckInRequest request,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.RespondPatientCheckInAsync(
                currentUser.UserIdOrThrow(),
                checkInId,
                request,
                cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> UpdatePatientPortalConsentAsync(
        Guid professionalId,
        string consentType,
        UpdatePatientConsentRequest request,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.UpdatePatientPortalConsentAsync(
                currentUser.UserIdOrThrow(),
                professionalId,
                consentType,
                request,
                cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> CreateAppointmentDraftAsync(
        Guid appointmentId,
        CreateClinicalDraftRequest request,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.CreateAppointmentDraftAsync(currentUser.UserIdOrThrow(), appointmentId, request, cancellationToken),
            draft => Results.Created($"/api/clinical/appointments/{appointmentId}/drafts/{draft.Id}", draft));
    }

    private static async Task<IResult> StartAppointmentSessionAsync(
        Guid appointmentId,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.StartAppointmentSessionAsync(currentUser.UserIdOrThrow(), appointmentId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> CompleteAppointmentSessionAsync(
        Guid appointmentId,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.CompleteAppointmentSessionAsync(currentUser.UserIdOrThrow(), appointmentId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> ApplyAppointmentTagsAsync(
        Guid appointmentId,
        ApplyClinicalTagsRequest request,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.ApplyAppointmentTagsAsync(currentUser.UserIdOrThrow(), appointmentId, request, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> ApproveDraftAsync(
        Guid draftId,
        ApproveClinicalDraftRequest request,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.ApproveDraftAsync(currentUser.UserIdOrThrow(), draftId, request, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> CreateRecordRectificationDraftAsync(
        Guid recordId,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.CreateRecordRectificationDraftAsync(currentUser.UserIdOrThrow(), recordId, cancellationToken),
            draft => Results.Created($"/api/clinical/records/{recordId}/rectifications/{draft.Id}", draft));
    }

    private static async Task<IResult> UpdateAppointmentConsentAsync(
        Guid appointmentId,
        string consentType,
        UpdatePatientConsentRequest request,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.UpdateAppointmentConsentAsync(
                currentUser.UserIdOrThrow(),
                appointmentId,
                consentType,
                request,
                cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> UpdateAppointmentTreatmentPlanAsync(
        Guid appointmentId,
        UpdateTreatmentPlanRequest request,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.UpdateAppointmentTreatmentPlanAsync(
                currentUser.UserIdOrThrow(),
                appointmentId,
                request,
                cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> CreateAppointmentTaskAsync(
        Guid appointmentId,
        CreatePatientTaskRequest request,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.CreateAppointmentTaskAsync(
                currentUser.UserIdOrThrow(),
                appointmentId,
                request,
                cancellationToken),
            task => Results.Created($"/api/clinical/appointments/{appointmentId}/tasks/{task.Id}", task));
    }

    private static async Task<IResult> ShareTaskAsync(
        Guid taskId,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.ShareTaskAsync(currentUser.UserIdOrThrow(), taskId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> UnshareTaskAsync(
        Guid taskId,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.UnshareTaskAsync(currentUser.UserIdOrThrow(), taskId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> CreateAppointmentMaterialAsync(
        Guid appointmentId,
        CreateSharedMaterialRequest request,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.CreateAppointmentMaterialAsync(
                currentUser.UserIdOrThrow(),
                appointmentId,
                request,
                cancellationToken),
            material => Results.Created($"/api/clinical/appointments/{appointmentId}/materials/{material.Id}", material));
    }

    private static async Task<IResult> ShareMaterialAsync(
        Guid materialId,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.ShareMaterialAsync(currentUser.UserIdOrThrow(), materialId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> UnshareMaterialAsync(
        Guid materialId,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.UnshareMaterialAsync(currentUser.UserIdOrThrow(), materialId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> CreateAppointmentCheckInAsync(
        Guid appointmentId,
        CreatePatientCheckInRequest request,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.CreateAppointmentCheckInAsync(
                currentUser.UserIdOrThrow(),
                appointmentId,
                request,
                cancellationToken),
            checkIn => Results.Created($"/api/clinical/appointments/{appointmentId}/check-ins/{checkIn.Id}", checkIn));
    }

    private static async Task<IResult> ShareCheckInAsync(
        Guid checkInId,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.ShareCheckInAsync(currentUser.UserIdOrThrow(), checkInId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> UnshareCheckInAsync(
        Guid checkInId,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.UnshareCheckInAsync(currentUser.UserIdOrThrow(), checkInId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> ExecuteAsync<T>(
        Func<Task<T>> action,
        Func<T, IResult> success)
    {
        try
        {
            return success(await action());
        }
        catch (InvalidOperationException exception)
        {
            return Results.BadRequest(new { message = exception.Message });
        }
        catch (KeyNotFoundException exception)
        {
            return Results.NotFound(new { message = exception.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (FormatException)
        {
            return Results.BadRequest(new { message = "Parâmetros inválidos." });
        }
    }
}
