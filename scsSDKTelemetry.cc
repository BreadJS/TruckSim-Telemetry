#define NODE_API_NO_EXTERNAL_BUFFERS_ALLOWED true
#include <node_api.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <dirent.h>

#if defined(_WIN32)
  #include <windows.h>
#else
  #include <sys/mman.h>
  #include <sys/stat.h>
  #include <fcntl.h>
  #include <unistd.h>
#endif

#if !defined(_WIN32)
// Helper function to find the game PID
static pid_t findGamePid() {
    DIR* proc_dir = opendir("/proc");
    if (!proc_dir) {
        return -1;
    }

    struct dirent* entry;
    pid_t game_pid = -1;

    while ((entry = readdir(proc_dir)) != nullptr) {
        // Check if the directory name is a number (PID)
        pid_t pid = atoi(entry->d_name);
        if (pid > 0) {
            // Read the cmdline file to check if it's the game
            char cmdline_path[256];
            snprintf(cmdline_path, sizeof(cmdline_path), "/proc/%d/cmdline", pid);

            FILE* cmdline_file = fopen(cmdline_path, "r");
            if (cmdline_file) {
                char cmdline[1024];
                size_t bytes_read = fread(cmdline, 1, sizeof(cmdline) - 1, cmdline_file);
                cmdline[bytes_read] = '\0';
                fclose(cmdline_file);

                // Check for eurotrucks2 or amtrucks
                if (strstr(cmdline, "eurotrucks2") != nullptr ||
                    strstr(cmdline, "amtrucks") != nullptr) {
                    game_pid = pid;
                    break;
                }
            }
        }
    }

    closedir(proc_dir);
    return game_pid;
}

// Helper function to check if a file exists
static bool fileExists(const char* path) {
    struct stat st;
    return (stat(path, &st) == 0);
}

// Helper function to get the actual shared memory path (handles sandbox)
// Returns a newly allocated string that must be freed by caller
static char* getSharedMemoryPath(const char* name) {
    // Remove leading slash from name if present
    const char* base_name = (name[0] == '/') ? name + 1 : name;

    // Try normal POSIX shared memory first
    char normal_path[256];
    snprintf(normal_path, sizeof(normal_path), "/dev/shm/%s", base_name);

    if (fileExists(normal_path)) {
        return strdup(normal_path);
    }

    // Check for sandboxed shared memory (Steam Proton/bwrap)
    pid_t game_pid = findGamePid();
    if (game_pid > 0) {
        char sandbox_path[512];
        snprintf(sandbox_path, sizeof(sandbox_path), "/proc/%d/root/dev/shm/%s",
                 game_pid, base_name);

        if (fileExists(sandbox_path)) {
            return strdup(sandbox_path);
        }
    }

    // Fall back to normal path (will fail if it doesn't exist)
    return strdup(normal_path);
}
#endif // !_WIN32

napi_value GetBuffer(napi_env env, napi_callback_info info) {
  char* sharedMemoryName;
  size_t argc = 1;
  size_t sharedMemoryNameSize;
  size_t sharedMemoryNameSizeRead;
  size_t sharedMemorySize = 32 * 1024; // 32 KB
  void* mappedFileView = nullptr;

  napi_status status;
  napi_value argv[1];

  // Retrieve arguments
  status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "Failed to retrieve arguments.");
    return nullptr;
  }

  // Get size of filename
  status = napi_get_value_string_utf8(env, argv[0], NULL, 0, &sharedMemoryNameSize);
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "Failed to get memory-mapped filename size.");
    return nullptr;
  }

  // Allocate memory for filename
  sharedMemoryName     = (char*)calloc(sharedMemoryNameSize + 1, sizeof(char));
  sharedMemoryNameSize = sharedMemoryNameSize + 1;

  // Set the filename value
  status = napi_get_value_string_utf8(env, argv[0], sharedMemoryName, sharedMemoryNameSize, &sharedMemoryNameSizeRead);
  if (status != napi_ok) {
    free(sharedMemoryName);
    napi_throw_error(env, NULL, "Failed to set memory-mapped filename.");
    return nullptr;
  }

#if defined(_WIN32)
  // Open the memory-mapped file
  HANDLE hMapFileSCSTelemetry = OpenFileMapping(FILE_MAP_READ, FALSE, sharedMemoryName);
  free(sharedMemoryName);
  if (!hMapFileSCSTelemetry) {
    napi_throw_error(env, NULL, "Failed trying to open memory-mapped file");
    return nullptr;
  }

  mappedFileView = MapViewOfFile(hMapFileSCSTelemetry, FILE_MAP_READ, 0, 0, sharedMemorySize);
  if (!mappedFileView) {
    CloseHandle(hMapFileSCSTelemetry);
    napi_throw_error(env, NULL, "Failed to map view of memory-mapped file");
    return nullptr;
  }
#else // POSIX (Linux, macOS)
  // Get the actual shared memory path (handles sandbox detection)
  char* actual_path = getSharedMemoryPath(sharedMemoryName);
  free(sharedMemoryName);

  // Open using regular open() to support both /dev/shm and sandbox paths
  int fd = open(actual_path, O_RDONLY);
  free(actual_path);

  if (fd == -1) {
    napi_throw_error(env, NULL, "Failed to open shared memory file. Ensure the game is running.");
    return nullptr;
  }

  mappedFileView = mmap(NULL, sharedMemorySize, PROT_READ, MAP_SHARED, fd, 0);
  if (mappedFileView == MAP_FAILED) {
    close(fd);
    napi_throw_error(env, NULL, "Failed to mmap shared memory");
    return nullptr;
  }
  close(fd);
#endif

  // Create a new buffer for use in javascript
  napi_value buffer;
  void* data;
  status = napi_create_buffer(env, sharedMemorySize, &data, &buffer);
  if (status != napi_ok) {

#if defined(_WIN32)
    UnmapViewOfFile(mappedFileView);
    CloseHandle(hMapFileSCSTelemetry);
#else
    munmap(mappedFileView, sharedMemorySize);
#endif

    napi_throw_error(env, NULL, "Failed to create buffer");
    return nullptr;
  }

  // Copy data from memory-mapped file to the new buffer
  memcpy(data, mappedFileView, sharedMemorySize);

  // Cleanup
#if defined(_WIN32)
  UnmapViewOfFile(mappedFileView);
  CloseHandle(hMapFileSCSTelemetry);
#else
  munmap(mappedFileView, sharedMemorySize);
#endif

  return buffer;
}

#define DECLARE_NAPI_METHOD(name, func)                                        \
  { name, 0, func, 0, 0, 0, napi_default, 0 }

napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor desc = DECLARE_NAPI_METHOD("getBuffer", GetBuffer);
  napi_define_properties(env, exports, 1, &desc);

  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
