/**
 * Helpers para erros HTTP padronizados nas rotas Fastify.
 */
import type { FastifyReply } from 'fastify';

export function badRequest(reply: FastifyReply, issues: unknown, message = 'Dados invalidos') {
  return reply.code(400).send({ error: 'ValidationError', message, issues });
}

export function notFound(reply: FastifyReply, message = 'Recurso nao encontrado') {
  return reply.code(404).send({ error: 'NotFound', message });
}

export function forbidden(reply: FastifyReply, message = 'Acesso negado') {
  return reply.code(403).send({ error: 'Forbidden', message });
}

export function conflict(reply: FastifyReply, message = 'Conflito') {
  return reply.code(409).send({ error: 'Conflict', message });
}
