package com.finsecure.repository;

import com.finsecure.entity.Customer;
import com.finsecure.entity.Customer.KycStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Optional<Customer> findByUserId(Long userId);

    Optional<Customer> findByPanNumber(String panNumber);

    Optional<Customer> findByAadharNumber(String aadharNumber);

    List<Customer> findByKycStatus(KycStatus kycStatus);

    Page<Customer> findByKycStatus(KycStatus kycStatus, Pageable pageable);

    @Query("SELECT c FROM Customer c WHERE c.user.email = :email")
    Optional<Customer> findByUserEmail(String email);

    @Query("SELECT c FROM Customer c WHERE LOWER(c.firstName) LIKE LOWER(CONCAT('%',:name,'%')) OR LOWER(c.lastName) LIKE LOWER(CONCAT('%',:name,'%'))")
    Page<Customer> searchByName(String name, Pageable pageable);

    @Query("SELECT c FROM Customer c INNER JOIN Account a ON a.customer.id = c.id WHERE a.accountNumber = :accountNumber")
    Optional<Customer> findByAccountNumber(String accountNumber);

    boolean existsByPanNumber(String panNumber);

    boolean existsByAadharNumber(String aadharNumber);
}