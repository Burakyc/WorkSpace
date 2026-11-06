using DevPath.Api.Infrastructure.Hosting;
using DevPath.Api.Infrastructure.Security;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Calendar;
using DevPath.Api.Modules.Content;
using DevPath.Api.Modules.Goals;
using DevPath.Api.Modules.Home;
using DevPath.Api.Modules.Notes;
using DevPath.Api.Modules.Pomodoro;
using DevPath.Api.Modules.Projects;
using DevPath.Api.Modules.Settings;

var builder = WebApplication.CreateBuilder(args);

var port = ApiPort.Resolve(builder.Configuration["DEVPATH_PORT"]);
var address = ApiBinding.Resolve(builder.Configuration["DEVPATH_IN_CONTAINER"]);
builder.WebHost.ConfigureKestrel(options => options.Listen(address, port));

builder.Services.AddControllers(options => options.Filters.Add<ValidationExceptionFilter>());
builder.Services.AddOpenApi();
builder.Services.AddCors();
builder.Services.AddHostedService<ParentProcessWatcher>();
builder.Services.AddSingleton(services => DataDirectory.Resolve(
    services.GetRequiredService<IConfiguration>()["DEVPATH_DATA_DIR"],
    services.GetRequiredService<IHostEnvironment>().IsDevelopment()));
builder.Services.AddSingleton<JsonFileStore>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddPomodoro();
builder.Services.AddGoals();
builder.Services.AddProjects();
builder.Services.AddNotes();
builder.Services.AddContent();
builder.Services.AddSingleton<SettingsService>();
builder.Services.AddSingleton<CalendarService>();
builder.Services.AddSingleton<DayService>();
builder.Services.AddSingleton<FeedService>();
builder.Services.AddYouTube();
builder.Services.AddGitHub();

var app = builder.Build();

var dataDirectory = app.Services.GetRequiredService<DataDirectory>();
Directory.CreateDirectory(dataDirectory.Path);
app.Logger.LogInformation("Data folder: {DataFolder}", dataDirectory.Path);

// CORS runs before the token check so browser preflights (which carry no custom headers) are answered.
var origin = app.Configuration["DEVPATH_ORIGIN"];
if (!string.IsNullOrWhiteSpace(origin))
{
    app.UseCors(policy => policy
        .WithOrigins(origin)
        .WithHeaders(ApiTokenMiddleware.HeaderName, "Content-Type")
        .WithMethods("GET", "POST", "PUT", "DELETE"));
}

var token = app.Configuration["DEVPATH_TOKEN"];
if (!string.IsNullOrWhiteSpace(token))
{
    app.UseMiddleware<ApiTokenMiddleware>(token);
}
else if (app.Environment.IsDevelopment())
{
    app.Logger.LogWarning("DEVPATH_TOKEN is not set. The token check is off; this is allowed in Development only.");
}
else
{
    throw new InvalidOperationException("DEVPATH_TOKEN must be set outside Development.");
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapControllers();

app.Run();
