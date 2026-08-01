{{- define "redis.name" -}}
redis
{{- end -}}

{{- define "redis.fullname" -}}
{{- printf "%s" (include "redis.name" .) -}}
{{- end -}}
