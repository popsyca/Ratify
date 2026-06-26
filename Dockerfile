# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build-env
WORKDIR /src

# Copy project file and restore
COPY Ratify.Api/Ratify.Api.csproj Ratify.Api/
RUN dotnet restore Ratify.Api/Ratify.Api.csproj

# Copy everything else and build
COPY Ratify.Api/ Ratify.Api/
COPY best-selling-books.csv ./
RUN dotnet publish Ratify.Api/Ratify.Api.csproj -c Release -o /app/out

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build-env /app/out .
# Copy best-selling-books.csv to the parent folder of /app (which is /) 
# so that Path.Combine("/app", "..", "best-selling-books.csv") works correctly in Docker
COPY --from=build-env /src/best-selling-books.csv /

# Expose port
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "Ratify.Api.dll"]
