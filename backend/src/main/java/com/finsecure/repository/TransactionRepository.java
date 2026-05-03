package com.finsecure.repository;

import com.finsecure.entity.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    Optional<Transaction> findByReferenceNumber(String referenceNumber);

    Page<Transaction> findByAccountId(Long accountId, Pageable pageable);

    List<Transaction> findByAccountIdAndCreatedAtBetween(Long accountId, LocalDateTime from, LocalDateTime to);

    @Query("SELECT t FROM Transaction t WHERE t.account.id = :accountId ORDER BY t.createdAt DESC")
    List<Transaction> findRecentByAccountId(Long accountId, Pageable pageable);

    @Query("SELECT t FROM Transaction t WHERE t.account.customer.id = :customerId ORDER BY t.createdAt DESC")
    Page<Transaction> findByCustomerId(Long customerId, Pageable pageable);

    @Query("""
        SELECT t FROM Transaction t WHERE t.account.id = :accountId
        AND (:type IS NULL OR t.type = :type)
        AND (:fromDate IS NULL OR t.createdAt >= :fromDate)
        AND (:toDate IS NULL OR t.createdAt <= :toDate)
        AND (:minAmount IS NULL OR t.amount >= :minAmount)
        AND (:maxAmount IS NULL OR t.amount <= :maxAmount)
        ORDER BY t.createdAt DESC
        """)
    Page<Transaction> findFiltered(
        Long accountId,
        @org.springframework.data.repository.query.Param("type") Transaction.TransactionType type,
        @org.springframework.data.repository.query.Param("fromDate") LocalDateTime fromDate,
        @org.springframework.data.repository.query.Param("toDate") LocalDateTime toDate,
        @org.springframework.data.repository.query.Param("minAmount") java.math.BigDecimal minAmount,
        @org.springframework.data.repository.query.Param("maxAmount") java.math.BigDecimal maxAmount,
        Pageable pageable);

    boolean existsByReferenceNumber(String referenceNumber);
}
