{{- define "mongo-auth.name" -}}
mongo-auth
{{- end -}}

{{- define "mongo-auth.fullname" -}}
{{- printf "%s" (include "mongo-auth.name" .) -}}
{{- end -}}
