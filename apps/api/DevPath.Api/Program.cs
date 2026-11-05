using System.Net;
using DevPath.Api.Infrastructure.Hosting;
using DevPath.Api.Infrastructure.Security;

var builder = WebApplication.CreateBuilder(args);

var port = ApiPort.Resolve(builder.Configuration["DEVPATH_PORT"]);
builder.WebHost.ConfigureKestrel(options => options.Listen(IPAddress.Loopback, port));

builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

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
